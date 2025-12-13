# redstone-cache-service

This is a NestJS web app, which serves as a gateway to the data in the RedStone ecosystem.

## Endpoints

- data-packages (main)
  - \[MAYBE\] the first 2 endpoints will be replaced with graphql
  - GET /data-packages/latest (query params: signerAddress, limit, dataServiceId)
  - GET /data-packages (query params: toTimestamp, signerAddress, limit, dataServiceId)
  - POST /data-packages (body = a single package)
  - POST /data-packages/bulk (body = array of data packages)
- other (helpful endpoints)
  - GET /oracle-registry-state
  - GET /symbols-metadata

## Background jobs

- oracle-registry-state-updater (run each 2 minutes)
- db-cleaner (will be launched every 1 hour, will remove too old data, e.g. data older than 7 days)

- Key differences
  - RedStone community and partners will be able to launch cache services
  - We will use additional hosted uptime-kuma to notify developers in case of problems
    - There are 2 ways to handle this
      1. Use push monitor type with upside-down mode (push errors to the uptime-kuma service with helpful messages)
      2. Use HTTP keyword fetching, and add to cache-services some additonal `/status` endpoint
