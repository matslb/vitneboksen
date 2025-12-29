@description('The name of the storage account (existing)')
param storageAccountName string

@description('The name of the resource group where resources will be deployed')
param resourceGroupName string

@description('The name of the container registry (e.g., myregistry.azurecr.io)')
param acrLoginServer string

@description('The name of the container image (e.g., finalvideo-worker:latest)')
param containerImageName string = 'finalvideo-worker:latest'

@description('Firebase auth secret')
@secure()
param firebaseAuthSecret string

@description('Firebase base path')
param firebaseBasePath string

@description('Location for all resources')
param location string = resourceGroup().location

// Get existing storage account
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' existing = {
  name: storageAccountName
}

// Storage Queue for final video processing requests
resource finalVideoQueue 'Microsoft.Storage/storageAccounts/queueServices/queues@2023-01-01' = {
  parent: storageAccount::queueServices
  name: 'final-video-processing-requests'
}

// User-Assigned Managed Identity for ACI container
resource uami 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-01' = {
  name: 'uami-finalvideo-worker'
  location: location
}

// Role assignment: UAMI -> Storage Blob Data Reader
resource uamiBlobReaderRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, uami.id, 'Storage Blob Data Reader')
  scope: storageAccount
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '2a2b9908-6ea1-4ae2-8e65-a410df84e7d1') // Storage Blob Data Reader
    principalId: uami.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

// Role assignment: UAMI -> Storage Blob Data Contributor
resource uamiBlobContributorRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, uami.id, 'Storage Blob Data Contributor')
  scope: storageAccount
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'ba92f5b4-2d11-453c-a0be-6b545d584ed4') // Storage Blob Data Contributor
    principalId: uami.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

// Logic App (Consumption) - Note: Workflow definition should be imported from logic-app-workflow.json
// This creates the Logic App resource, but the workflow definition should be configured via Azure Portal or ARM template
resource logicApp 'Microsoft.Logic/workflows@2019-05-01' = {
  name: 'la-finalvideo-orchestrator'
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    state: 'Enabled'
    // Workflow definition should be imported from logic-app-workflow.json file
    // or configured via Azure Portal after deployment
  }
}

// Role assignment: Logic App system-assigned identity -> Contributor on resource group (for ACI management)
resource logicAppContributorRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, logicApp.id, 'Contributor')
  scope: resourceGroup()
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'b24988ac-6180-42a0-ab88-20f7382dd24c') // Contributor
    principalId: logicApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// Outputs
output uamiId string = uami.id
output uamiClientId string = uami.properties.clientId
output uamiPrincipalId string = uami.properties.principalId
output logicAppName string = logicApp.name
output queueName string = finalVideoQueue.name

