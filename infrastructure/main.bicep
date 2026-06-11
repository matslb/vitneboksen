@description('The name of the storage account (existing, holds blobs and queues)')
param storageAccountName string

@description('Full container image reference for the video worker (e.g. ghcr.io/matslb/vitneboksen/video-worker:latest). Image must be publicly pullable.')
param containerImage string = 'ghcr.io/matslb/vitneboksen/video-worker:latest'

@description('Firebase auth secret')
@secure()
param firebaseAuthSecret string

@description('Firebase Realtime Database base path')
param firebaseBasePath string

@description('Location for all resources')
param location string = resourceGroup().location

// ----------------------------------------------------------------------------
// Existing storage account + processing queues
// ----------------------------------------------------------------------------

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' existing = {
  name: storageAccountName
}

resource queueServices 'Microsoft.Storage/storageAccounts/queueServices@2023-01-01' = {
  parent: storageAccount
  name: 'default'
}

resource encodingQueue 'Microsoft.Storage/storageAccounts/queueServices/queues@2023-01-01' = {
  parent: queueServices
  name: 'video-encoding-requests'
}

resource finalVideoQueue 'Microsoft.Storage/storageAccounts/queueServices/queues@2023-01-01' = {
  parent: queueServices
  name: 'final-video-requests'
}

var storageConnectionString = 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=${environment().suffixes.storage}'

// ----------------------------------------------------------------------------
// Container Apps environment (consumption, scale-to-zero)
// ----------------------------------------------------------------------------

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: 'log-vitneboksen'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

resource containerAppsEnvironment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: 'cae-vitneboksen'
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

// ----------------------------------------------------------------------------
// Worker jobs — same image, JOB_MODE selects behavior
// ----------------------------------------------------------------------------

var workerSecrets = [
  {
    name: 'storage-connection-string'
    value: storageConnectionString
  }
  {
    name: 'firebase-auth-secret'
    value: firebaseAuthSecret
  }
]

var workerEnv = [
  {
    name: 'StorageConnectionString'
    secretRef: 'storage-connection-string'
  }
  {
    name: 'FireSharp__AuthSecret'
    secretRef: 'firebase-auth-secret'
  }
  {
    name: 'FireSharp__BasePath'
    value: firebaseBasePath
  }
]

resource encodeJob 'Microsoft.App/jobs@2024-03-01' = {
  name: 'vitneboksen-encode-job'
  location: location
  properties: {
    environmentId: containerAppsEnvironment.id
    configuration: {
      triggerType: 'Event'
      replicaTimeout: 1800
      replicaRetryLimit: 1
      secrets: workerSecrets
      eventTriggerConfig: {
        parallelism: 1
        replicaCompletionCount: 1
        scale: {
          minExecutions: 0
          maxExecutions: 5
          pollingInterval: 30
          rules: [
            {
              name: 'encoding-queue'
              type: 'azure-queue'
              metadata: {
                queueName: encodingQueue.name
                queueLength: '1'
                accountName: storageAccount.name
              }
              auth: [
                {
                  secretRef: 'storage-connection-string'
                  triggerParameter: 'connection'
                }
              ]
            }
          ]
        }
      }
    }
    template: {
      containers: [
        {
          name: 'video-worker'
          image: containerImage
          resources: {
            cpu: json('1')
            memory: '2Gi'
          }
          env: concat(workerEnv, [
            {
              name: 'JOB_MODE'
              value: 'encode'
            }
          ])
        }
      ]
    }
  }
}

resource finalVideoJob 'Microsoft.App/jobs@2024-03-01' = {
  name: 'vitneboksen-finalvideo-job'
  location: location
  properties: {
    environmentId: containerAppsEnvironment.id
    configuration: {
      triggerType: 'Event'
      replicaTimeout: 3600
      replicaRetryLimit: 1
      secrets: workerSecrets
      eventTriggerConfig: {
        parallelism: 1
        replicaCompletionCount: 1
        scale: {
          minExecutions: 0
          maxExecutions: 2
          pollingInterval: 30
          rules: [
            {
              name: 'finalvideo-queue'
              type: 'azure-queue'
              metadata: {
                queueName: finalVideoQueue.name
                queueLength: '1'
                accountName: storageAccount.name
              }
              auth: [
                {
                  secretRef: 'storage-connection-string'
                  triggerParameter: 'connection'
                }
              ]
            }
          ]
        }
      }
    }
    template: {
      containers: [
        {
          name: 'video-worker'
          image: containerImage
          resources: {
            cpu: json('2')
            memory: '4Gi'
          }
          env: concat(workerEnv, [
            {
              name: 'JOB_MODE'
              value: 'finalvideo'
            }
          ])
        }
      ]
    }
  }
}

output encodeJobName string = encodeJob.name
output finalVideoJobName string = finalVideoJob.name
output environmentName string = containerAppsEnvironment.name
output encodingQueueName string = encodingQueue.name
output finalVideoQueueName string = finalVideoQueue.name
