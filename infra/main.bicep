// Azure Container Apps deployment for appointments-web.
//
// Why this exists: the delivery pipeline (cd.yml) targets Azure Container Apps as the primary
// environment. This template is the infrastructure-as-code for one environment (staging or
// production). docker-compose.prod.yml is the no-cloud fallback; this is the real target.
//
// What it creates:
//   - a Log Analytics workspace (Container Apps needs one for logs),
//   - a Container Apps managed environment,
//   - the web container app (external ingress on 8080, autoscaling, a health probe).
//
// The web image is static (nginx serving the built SPA and reverse-proxying /api). It has no
// database or cache of its own; it only needs to know where the API is, via API_UPSTREAM. In a
// shared environment the API runs as another container app and the web proxies to it; pass its
// reachable host:port as `apiUpstream`.

@description('Deployment environment name, used as a suffix on resource names.')
@allowed(['staging', 'production'])
param environmentName string

@description('Azure region for all resources.')
param location string = resourceGroup().location

@description('Container image reference, e.g. ghcr.io/evg-g/appointments-web:1.2.3')
param image string

@description('Host:port the SPA proxies /api and /health to, e.g. appointments-api-staging:8000 for an app sharing this environment.')
param apiUpstream string

@description('Min / max replicas for the web tier.')
param minReplicas int = 1
param maxReplicas int = 3

resource logs 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: 'log-web-${environmentName}'
  location: location
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
  }
}

resource caeEnv 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: 'cae-web-${environmentName}'
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logs.properties.customerId
        sharedKey: logs.listKeys().primarySharedKey
      }
    }
  }
}

resource web 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'appointments-web-${environmentName}'
  location: location
  properties: {
    managedEnvironmentId: caeEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 8080
        transport: 'auto'
      }
    }
    template: {
      containers: [
        {
          name: 'web'
          image: image
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          env: [
            { name: 'API_UPSTREAM', value: apiUpstream }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: { path: '/', port: 8080 }
              periodSeconds: 30
            }
            {
              type: 'Readiness'
              httpGet: { path: '/', port: 8080 }
              periodSeconds: 10
            }
          ]
        }
      ]
      scale: {
        minReplicas: minReplicas
        maxReplicas: maxReplicas
        rules: [
          {
            name: 'http-scale'
            http: { metadata: { concurrentRequests: '50' } }
          }
        ]
      }
    }
  }
}

output webFqdn string = web.properties.configuration.ingress.fqdn
output webUrl string = 'https://${web.properties.configuration.ingress.fqdn}'
