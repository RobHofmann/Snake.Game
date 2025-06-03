targetScope = 'subscription'

@description('The environment type (dev, tst, acc, prd).')
@allowed(['dev', 'tst', 'acc', 'prd'])
param environmentType string

@description('The Azure region for the resource group.')
param location string = 'westeurope'

@description('The CMDB Application ID for tagging.')
param cmdbApplicationId string

var resourceGroupName = 'snake-game-${environmentType}'

resource rg 'Microsoft.Resources/resourceGroups@2023-07-01' = {
  name: resourceGroupName
  location: location
  tags: {
    EnvironmentType: environmentType
    CmdbApplicationId: cmdbApplicationId
  }
}

output resourceGroupId string = rg.id
output resourceGroupName string = rg.name
