# Deployment Procedures - Snake Game

**Date: June 4, 2025**

## 1. Overview

This document outlines the deployment procedures for the Snake Game application, covering infrastructure provisioning, application deployment, and environment-specific configurations.

## 2. Deployment Environments

| Environment       | Purpose                 | URL                                         | Azure Resource Group |
| ----------------- | ----------------------- | ------------------------------------------- | -------------------- |
| Development (dev) | Development testing     | https://app-snake-api-dev.azurewebsites.net | snake-game-dev       |
| Test (tst)        | QA testing              | https://app-snake-api-tst.azurewebsites.net | snake-game-tst       |
| Acceptance (acc)  | User acceptance testing | https://app-snake-api-acc.azurewebsites.net | snake-game-acc       |
| Production (prd)  | Live environment        | https://app-snake-api-prd.azurewebsites.net | snake-game-prd       |

## 3. Deployment Architecture

The Snake Game deployment follows a tiered deployment approach targeting Azure PaaS services:

```
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│ Development   │  →   │ Test          │  →   │ Acceptance    │  →   ┌───────────────┐
│ Environment   │      │ Environment   │      │ Environment   │      │ Production    │
└───────────────┘      └───────────────┘      └───────────────┘      │ Environment   │
                                                                     └───────────────┘
```

## 4. Infrastructure Provisioning

Infrastructure is provisioned using Bicep templates with environment-specific parameter files.

### 4.1 Provisioning Steps

1. Create Resource Group (if it doesn't exist):

```powershell
az deployment sub create `
  --location "westeurope" `
  --template-file "pipelines/Snake.Game/bicep/resourcegroup.bicep" `
  --parameters environmentType="dev" location="westeurope" cmdbApplicationId="SNAKE-001"
```

2. Deploy Infrastructure:

```powershell
az deployment group create `
  --resource-group "snake-game-dev" `
  --template-file "pipelines/Snake.Game/bicep/main.bicep" `
  --parameters @"pipelines/Snake.Game/bicep/dev.parameters.json"
```

### 4.2 Resource Dependencies

The deployment order is managed in the Bicep templates with the following dependencies:

1. Managed Identity (for secure access to other resources)
2. Key Vault (for secret management)
3. Storage Account (for static web content)
4. Application Insights (for monitoring)
5. SQL Database (for data storage)
6. App Service Plan (for hosting)
7. App Service (for the API)

## 5. Application Deployment

### 5.1 Backend API Deployment

The backend API is deployed to Azure App Service using the AzureWebApp task in Azure DevOps.

```yaml
- task: AzureWebApp@1
  displayName: "Deploy API to App Service"
  inputs:
    azureSubscription: "$(AzureSubscriptionName)"
    appType: "webApp"
    appName: "app-snake-api-$(EnvironmentType)"
    package: "$(Pipeline.Workspace)/drop/Snake.API.zip"
    deploymentMethod: "auto"
```

### 5.2 Frontend Deployment

The frontend static files are deployed to the Azure App Service:

```yaml
- task: AzureWebApp@1
  displayName: "Deploy Web to App Service"
  inputs:
    azureSubscription: "$(AzureSubscriptionName)"
    appType: "webApp"
    appName: "app-snake-api-$(EnvironmentType)"
    package: "$(Pipeline.Workspace)/drop/Snake.Web.zip"
    deploymentMethod: "auto"
```

## 6. Database Migrations

Database migrations are run as part of the deployment process:

```yaml
- task: AzureCLI@2
  displayName: "Run Database Migrations"
  inputs:
    azureSubscription: "$(AzureSubscriptionName)"
    scriptType: "pscore"
    scriptLocation: "inlineScript"
    inlineScript: |
      dotnet tool install --global dotnet-ef
      dotnet ef database update --project src/Snake.Persistence/Snake.Persistence.csproj --startup-project src/Snake.API/Snake.API.csproj --connection "$(SqlConnectionString)"
```

## 7. Configuration Management

### 7.1 App Settings

Application settings are managed through the Azure App Service configuration:

```yaml
- task: AzureAppServiceSettings@1
  displayName: "Configure App Settings"
  inputs:
    azureSubscription: "$(AzureSubscriptionName)"
    appName: "app-snake-api-$(EnvironmentType)"
    resourceGroupName: "snake-game-$(EnvironmentType)"
    appSettings: |
      [
        {
          "name": "ASPNETCORE_ENVIRONMENT",
          "value": "$(EnvironmentType)",
          "slotSetting": false
        },
        {
          "name": "ApplicationInsights__InstrumentationKey",
          "value": "$(ApplicationInsightsKey)",
          "slotSetting": false
        }
      ]
```

### 7.2 Connection Strings

Connection strings are stored in Key Vault and referenced by the App Service:

```yaml
- task: AzureAppServiceSettings@1
  displayName: "Configure Connection Strings"
  inputs:
    azureSubscription: "$(AzureSubscriptionName)"
    appName: "app-snake-api-$(EnvironmentType)"
    resourceGroupName: "snake-game-$(EnvironmentType)"
    connectionStrings: |
      [
        {
          "name": "DefaultConnection",
          "value": "@Microsoft.KeyVault(SecretUri=https://kv-snake-game-$(EnvironmentType).vault.azure.net/secrets/SqlConnectionString/)",
          "type": "SQLAzure",
          "slotSetting": false
        }
      ]
```

## 8. Deployment Verification

### 8.1 Smoke Tests

After deployment, smoke tests are run to ensure basic functionality:

```yaml
- task: PowerShell@2
  displayName: "Run Smoke Tests"
  inputs:
    targetType: "filePath"
    filePath: "tests/Scripts/SmokeTests.ps1"
    arguments: "-BaseUrl https://app-snake-api-$(EnvironmentType).azurewebsites.net"
```

### 8.2 Health Checks

The application includes health check endpoints for monitoring:

- `/health` - Overall application health
- `/health/live` - Liveness probe
- `/health/ready` - Readiness probe

## 9. Rollback Procedures

### 9.1 Automated Rollback

If a deployment fails, the pipeline automatically rolls back to the previous version:

```yaml
- task: AzureWebApp@1
  displayName: "Rollback to Previous Version"
  condition: failed()
  inputs:
    azureSubscription: "$(AzureSubscriptionName)"
    appType: "webApp"
    appName: "app-snake-api-$(EnvironmentType)"
    deployToSlotOrASE: true
    resourceGroupName: "snake-game-$(EnvironmentType)"
    slotName: "production"
    deploymentMethod: "auto"
    deployToSlotOrASEFlag: true
```

### 9.2 Manual Rollback

For manual rollback, use the Azure Portal to swap back to a previous deployment slot or use the Azure CLI:

```powershell
az webapp deployment slot swap -g snake-game-prd -n app-snake-api-prd --slot staging --target-slot production
```

## 10. Monitoring Deployment

### 10.1 Application Insights

Deployments are monitored using Application Insights:

- Real-time metrics during and after deployment
- Custom events for deployment steps
- Availability tests for key endpoints

### 10.2 Alerting

Alerts are configured to notify the team of deployment issues:

```bicep
resource deploymentAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: 'Deployment Failure Alert'
  location: 'global'
  properties: {
    severity: 1
    enabled: true
    scopes: [
      appService.id
    ]
    evaluationFrequency: 'PT1M'
    windowSize: 'PT5M'
    criteria: {
      allOf: [
        {
          metricName: 'Http5xx'
          operator: 'GreaterThan'
          threshold: 5
          timeAggregation: 'Total'
        }
      ]
    }
    actions: [
      {
        actionGroupId: actionGroup.id
      }
    ]
  }
}
```

**Version:** 1.0  
**Last Updated:** June 4, 2025
