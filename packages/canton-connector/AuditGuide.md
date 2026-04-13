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
* Path: [packages/canton-connector/daml](./daml)

The direct path should look like:
[https://github.com/redstone-finance/redstone-oracles-monorepo/tree/[COMMIT_ID]/packages/canton-connector/daml](https://github.com/redstone-finance/redstone-oracles-monorepo/tree/main/packages/canton-connector/daml)

## Code description

* General assumptions [daml/README.md](./daml/README.md)
* SDK (payload processing & crypto verification) [daml/sdk/README.md](./daml/sdk/README.md)
* Core (RedStoneCore template) [daml/core/README.md](./daml/core/README.md)
* Adapter (RedStoneAdapter template with write/read) [daml/adapter/README.md](./daml/adapter/README.md)
* Reward Factory (RedStoneRewardFactory template) [daml/reward_factory/README.md](./daml/reward_factory/README.md)
* RedStone DAML SDK [daml/sdk/src/RedStone/](./daml/sdk/src/RedStone/)
* General [RedStone Blockchain oracles docs](https://docs.redstone.finance/docs/architecture/#data-formatting--processing)
  * Especially [The push model docs](https://docs.redstone.finance/docs/dapps/redstone-push/)

## What should be audited

### DAML packages & templates

Do audit:

* [sdk](./daml/sdk) — RedStone DAML SDK: payload parsing, cryptographic signature verification (secp256k1 ECDSA), median aggregation, U256 arithmetic
* [types](./daml/types) — RedStone type definitions (RedStoneFeedId, RedStoneValue, RedStonePriceData, etc.)
* [interface](./daml/interface) — Interface definitions: IRedStoneCore, IRedStoneAdapter, IRedStonePricePillFactory, IRedStoneRewardFactory
* [price_pill](./daml/price_pill) — IRedStonePricePill interface definition (price pill read/archive choices)
* [core](./daml/core) — RedStoneCore template: price retrieval via disclosed contracts
* [adapter](./daml/adapter) — RedStoneAdapter template: write/read prices, pill record management, staleness verification
* [factory](./daml/factory) — RedStonePricePillFactory template: creates price pill contracts
* [price_feed](./daml/price_feed) — RedStonePricePill template: individual price feed contracts with staleness checks
* [reward_factory](./daml/reward_factory) — RedStoneRewardFactory template: batched reward creation via FeaturedAppRight
* [featured](./daml/featured) — Featured app integration (Splice/Canton Network rewards)
* [common](./daml/common) — Common utilities (time conversions)

### DAML files

The code-lines inside the following files of the directories above should be audited:

- ./daml/**/src/**/*.daml

And the following **should not**:

* Imports
* Code comments
* Empty lines

### Other files

* We suggest to read `**/README.md`
* We suggest to audit Dependencies inside `**/daml.yaml` files
