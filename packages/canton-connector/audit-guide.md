# RedStone Canton Connector - Audit Guide

## Repository

* The repository: https://github.com/redstone-finance/redstone-oracles-monorepo
* The CommitId: [will be prepared for the particular version]
* Path: [packages/canton-connector/daml](./daml)


  The direct path should look like:
  [https://github.com/redstone-finance/redstone-oracles-monorepo/tree/[COMMIT_ID]/packages/canton-connector/daml](https://github.com/redstone-finance/redstone-oracles-monorepo/tree/main/packages/canton-connector/daml)

## Code description

...

## What should be audited

### Daml files

The code-lines inside the following sections should be audited.

And the following **should not**:

* imports
* Code comments
* Empty lines

#### SDK

All DAML files but tests:

- ./sdk/src/Internal/**.daml
- ./sdk/src/*.daml

#### Interface

- ./featured/src/IRedStoneCoreFeatured.daml
- ./interface/src/RedStoneTypes.daml
- ./interface/src/IRedStonePricePill.daml

#### Contract

- ./core/src/RedStoneCoreFeatured.daml
- ./factory/src/RedStonePricePillFactory.daml
- ./featured/src/Featured.daml
- ./price_feed/src/RedStonePricePill.daml
