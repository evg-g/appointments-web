using './main.bicep'

// Example parameter file for the production environment.

param environmentName = 'production'
param image = readEnvironmentVariable('IMAGE', 'ghcr.io/evg-g/appointments-web:latest')
param apiUpstream = readEnvironmentVariable('API_UPSTREAM', 'appointments-api-production:8000')
param minReplicas = 2
param maxReplicas = 5
