# RedStone Canton Connector - Audit Guide

<!-- TOC -->
* [RedStone Canton Connector - Audit Guide](#redstone-canton-connector---audit-guide)
  * [Repository](#repository)
  * [Code description](#code-description)
  * [What should be audited](#what-should-be-audited)
    * [DAML packages & templates](#daml-packages--templates)
    * [DAML files](#daml-files)
    * [Other files](#other-files)
<!-- TOC -->

## Repository

* The repository: https://github.com/redstone-finance/redstone-oracles-monorepo
* The CommitId: [will be prepared for the particular version]
* Path: [packages/canton-connector/deployments/cantonDevnetMultiFeed](.)

The direct path should look like:
[https://github.com/redstone-finance/redstone-oracles-monorepo/tree/[COMMIT_ID]/packages/canton-connector/deployments/cantonDevnetMultiFeed](https://github.com/redstone-finance/redstone-oracles-monorepo/tree/main/packages/canton-connector/deployments/cantonDevnetMultiFeed)

## Code description

* General assumptions [README.md](./README.md)
* SDK (payload processing & crypto verification) [sdk/README.md](./sdk/README.md)
* Core (RedStoneCore template) [core/README.md](./core/README.md)
* Adapter (RedStoneAdapter template with write/read) [adapter/README.md](./adapter/README.md)
* Reward Factory (RedStoneRewardFactory template) [reward_factory/README.md](./reward_factory/README.md)
* RedStone DAML SDK [sdk/src/RedStone/](./sdk/src/RedStone/)
* General [RedStone Blockchain oracles docs](https://docs.redstone.finance/docs/architecture/#data-formatting--processing)
  * Especially [The push model docs](https://docs.redstone.finance/docs/dapps/redstone-push/)

## What should be audited

### DAML packages & templates

Do audit:

* [sdk](./sdk) — RedStone DAML SDK: payload parsing, cryptographic signature verification (secp256k1 ECDSA), median aggregation, U256 arithmetic
* [types](./types) — RedStone type definitions (RedStoneFeedId, RedStoneValue, RedStonePriceData, etc.)
* [interface](./interface) — Interface definitions: IRedStoneCore, IRedStoneAdapter, IRedStonePricePillFactory, IRedStoneRewardFactory
* [price_pill](./price_pill) — IRedStonePricePill interface definition (price pill read/archive choices)
* [core](./core) — RedStoneCore template: price retrieval via disclosed contracts
* [adapter](./adapter) — RedStoneAdapter template: write/read prices, pill record management, staleness verification
* [factory](./factory) — RedStonePricePillFactory template: creates price pill contracts
* [price_feed](./price_feed) — RedStonePricePill template: individual price feed contracts with staleness checks
* [reward_factory](./reward_factory) — RedStoneRewardFactory template: batched reward creation via FeaturedAppRight
* [featured](./featured) — Featured app integration (Splice/Canton Network rewards)
* [common](./common) — Common utilities (time conversions)

### DAML files

The code-lines inside the following files of the directories above should be audited:

- ./**/src/**/*.daml

And the following **should not**:

* Imports
* Code comments
* Empty lines

### Other files

* We suggest to read `**/README.md`
* We suggest to audit Dependencies inside `**/daml.yaml` files
