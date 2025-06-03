// filename: main.bicep
@description('The environment type (dev, tst, acc, prd)')
@allowed(['dev', 'tst', 'acc', 'prd'])
param environmentType string

@description('The Azure region for deployment.')
param location string = resourceGroup().location

@description('The name prefix for all resources')
param namePrefix string = 'snake-game'

// Resource name variables
var names = {
  appServicePlan: 'plan-${namePrefix}-${environmentType}'
  appService: 'app-snake-api-${environmentType}'
  storageAccount: 'stsnakegame${environmentType}'
  cosmosDb: 'cosmos-${namePrefix}-${environmentType}'
  keyVault: 'kv-${namePrefix}-${environmentType}'
  appInsights: 'ai-${namePrefix}-${environmentType}'
  managedIdentity: 'id-app-${namePrefix}-${environmentType}'
}

// Tags that will be applied to all resources
var tags = {
  Environment: environmentType
  Application: namePrefix
}

// User Assigned Managed Identity
resource managedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: names.managedIdentity
  location: location
  tags: tags
}

// Key Vault with RBAC
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: names.keyVault
  location: location
  tags: tags
  properties: {
    tenantId: subscription().tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    accessPolicies: []
  }
}

// Storage Account for static content
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: names.storageAccount
  location: location
  tags: tags
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    supportsHttpsTrafficOnly: true
  }
}

// Cosmos DB Account
resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2023-04-15' = {
  name: 'cosmos-${namePrefix}-${environmentType}'
  location: location
  tags: tags
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    capabilities: [
      {
        name: 'EnableServerless' // Using serverless for cost optimization
      }
    ]
  }
}

// Cosmos DB Database
resource cosmosDatabase 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2023-04-15' = {
  parent: cosmosAccount
  name: 'SnakeGameDB'
  properties: {
    resource: {
      id: 'SnakeGameDB'
    }
  }
}

// Cosmos DB Container for Leaderboard
resource leaderboardContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-04-15' = {
  parent: cosmosDatabase
  name: 'Leaderboard'
  properties: {
    resource: {
      id: 'Leaderboard'
      partitionKey: {
        paths: [
          '/partitionKey'
        ]
        kind: 'Hash'
      }
      indexingPolicy: {
        indexingMode: 'consistent'
        includedPaths: [
          {
            path: '/*'
          }
        ]
      }
    }
  }
}

// Application Insights
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: names.appInsights
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: null
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

// App Service Plan
resource appServicePlan 'Microsoft.Web/serverfarms@2022-09-01' = {
  name: names.appServicePlan
  location: location
  tags: tags
  sku: {
    name: environmentType == 'prd' ? 'P1v3' : 'B1'
  }
  properties: {}
}

// App Service (Web API)
resource appService 'Microsoft.Web/sites@2022-09-01' = {
  name: names.appService
  location: location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${managedIdentity.id}': {}
    }
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    clientAffinityEnabled: false
    siteConfig: {
      alwaysOn: true
      http20Enabled: true
      minTlsVersion: '1.2'
      netFrameworkVersion: 'v8.0'
      appSettings: [
        {
          name: 'APPINSIGHTS_INSTRUMENTATIONKEY'
          value: appInsights.properties.InstrumentationKey
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsights.properties.ConnectionString
        }
        {
          name: 'KeyVaultUri'
          value: keyVault.properties.vaultUri
        }
        {
          name: 'AZURE_CLIENT_ID'
          value: managedIdentity.properties.clientId
        }
        {
          name: 'StorageAccountName'
          value: storageAccount.name
        }        {
          name: 'CosmosDb__Endpoint'
          value: cosmosAccount.properties.documentEndpoint
        }
        {
          name: 'CosmosDb__DatabaseName'
          value: cosmosDatabase.name
        }
        {
          name: 'CosmosDb__ContainerName'
          value: leaderboardContainer.name
        }
      ]
    }
  }
}

// Grant Key Vault Reader role to the managed identity
resource keyVaultReaderRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, managedIdentity.id, 'Key Vault Reader')
  scope: keyVault
  properties: {
    principalId: managedIdentity.properties.principalId
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      '21090545-7ca7-4776-b22c-e363652d74d2'
    ) // Key Vault Reader
    principalType: 'ServicePrincipal'
  }
}

// Grant Key Vault Secrets User role to the managed identity
resource keyVaultSecretsUserRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, managedIdentity.id, 'Key Vault Secrets User')
  scope: keyVault
  properties: {
    principalId: managedIdentity.properties.principalId
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      '4633458b-17de-408a-b874-0445c86b69e6'
    ) // Key Vault Secrets User
    principalType: 'ServicePrincipal'
  }
}

// Grant Storage Blob Data Contributor role to the managed identity
resource storageBlobDataContributorRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storageAccount.id, managedIdentity.id, 'Storage Blob Data Contributor')
  scope: storageAccount
  properties: {
    principalId: managedIdentity.properties.principalId
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      'ba92f5b4-2d11-453d-a403-e96b0029c9fe'
    ) // Storage Blob Data Contributor
    principalType: 'ServicePrincipal'
  }
}

// Grant Cosmos DB Data Contributor role to the managed identity
resource cosmosDbDataContributorRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(cosmosAccount.id, managedIdentity.id, 'Cosmos DB Data Contributor')
  scope: cosmosAccount
  properties: {
    principalId: managedIdentity.properties.principalId
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      '00000000-0000-0000-0000-000000000002'
    ) // Cosmos DB Data Contributor
    principalType: 'ServicePrincipal'
  }
}

output appServicePlanId string = appServicePlan.id
output appServiceName string = appService.name
output keyVaultUri string = keyVault.properties.vaultUri
output appInsightsInstrumentationKey string = appInsights.properties.InstrumentationKey
output appInsightsConnectionString string = appInsights.properties.ConnectionString
output storageAccountName string = storageAccount.name
output managedIdentityClientId string = managedIdentity.properties.clientId
output cosmosDbEndpoint string = cosmosAccount.properties.documentEndpoint
output cosmosDbName string = cosmosDatabase.name
