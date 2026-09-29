using './main.bicep'

// Example parameter file for the staging environment.
// Nothing sensitive is committed; the image tag and the API upstream come from the environment at
// deploy time (the pipeline sets IMAGE; API_UPSTREAM points at the staging API app).

param environmentName = 'staging'
param image = readEnvironmentVariable('IMAGE', 'ghcr.io/evg-g/appointments-web:latest')
param apiUpstream = readEnvironmentVariable('API_UPSTREAM', 'appointments-api-staging:8000')
param minReplicas = 1
param maxReplicas = 2
