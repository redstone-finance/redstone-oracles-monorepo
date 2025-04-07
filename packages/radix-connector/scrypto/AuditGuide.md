# Radix - Audit guide

<!-- TOC -->
* [Radix - Audit guide](#radix---audit-guide)
  * [Repository](#repository)
  * [Code description](#code-description)
  * [What should be audited](#what-should-be-audited)
    * [Blueprints & libraries](#blueprints--libraries)
    * [Rust files](#rust-files)
    * [Other files](#other-files)
<!-- TOC -->

## Repository

* The repository: https://github.com/redstone-finance/redstone-oracles-monorepo
* The CommitId: [will be prepared for the particular version]
* Path: [packages/radix-connector/scrypto](.)

The direct path should look like:
[https://github.com/redstone-finance/redstone-oracles-monorepo/tree/[COMMIT_ID]/packages/radix-connector/scrypto](https://github.com/redstone-finance/redstone-oracles-monorepo/tree/main/packages/radix-connector/scrypto/contracts)

## Code description

* General assumptions [contracts/README.md](./contracts/README.md)
* PriceAdapter [contracts/price_adapter/README.md](./contracts/price_adapter/README.md)
* PriceFeed [contracts/price_feed/src/price_feed.rs](./contracts/price_feed/src/price_feed.rs)
* RedStone Rust SDK [https://github.com/redstone-finance/rust-sdk](https://github.com/redstone-finance/rust-sdk/tree/2.0.0)
* General [RedStone Blockchain oracles docs](https://docs.redstone.finance/docs/architecture/#data-formatting--processing)
  * Especially [The push model docs](https://docs.redstone.finance/docs/dapps/redstone-push/):

## What should be audited

### Blueprints & libraries

Do audit

* [common](./common) - a helper library & RedStone Rust SDK adapter
* [price_adapter](./contracts/price_adapter) - see [general assumptions](contracts/README.md#price-adapter)
* [price_feed](./contracts/price_feed) - see [general assumptions](contracts/README.md#price-feed)
* [proxy](./contracts/proxy) - see [general assumptions](contracts/README.md#proxy)


### Rust files

The code-lines inside the following sections in `*/src/**/*.rs` files should be audited.

And the following **should not**:

* Imports (use modules)
* Tests and dev utility (code under #[cfg(feature = "dev")] and #cfg[(test)]).
* Code comments
* Empty lines
* Code inside test files inside `*/tests/**` directories

### Other files

* We suggest to read `**/README.md`
* We suggest to audit Dependencies inside `**/Cargo.toml` files
