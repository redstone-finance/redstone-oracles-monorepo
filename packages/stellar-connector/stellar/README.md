# Stellar - Audit guide

<!-- TOC -->
* [Stellar - Audit guide](#stellar---audit-guide)
  * [Repository](#repository)
  * [Code description](#code-description)
  * [General assumptions](#general-assumptions)
  * [What should be audited](#what-should-be-audited)
    * [Rust files](#rust-files)
    * [Other files](#other-files)
<!-- TOC -->

## Repository

* The repository: https://github.com/redstone-finance/redstone-oracles-monorepo
* The CommitId: [will be prepared for the particular version]
* Path: `packages/stellar-connector/deployments/stellarMultiFeed`

The direct path should look like:
[https://github.com/redstone-finance/redstone-oracles-monorepo/tree/[COMMIT_ID]/packages/stellar-connector/deployments/stellarMultiFeed](https://github.com/redstone-finance/redstone-oracles-monorepo/tree/main/packages/stellar-connector/deployments/stellarMultiFeed)

## Code description

* Contracts [contracts/README.md](./contracts/README.md)
* General [RedStone Technical architecture](https://docs.redstone.finance/docs/architecture/)
  * Especially [The push model docs](https://docs.redstone.finance/docs/dapps/redstone-push/)

## General assumptions

- The [RedStoneAdapter](./contracts/redstone-adapter) contract is updated from one or more off-chain processes.
- The data are stored in the storage as [`PriceData`](./common/src/lib.rs), one per feed id.
- Contract parameters and/or Logic update require changing the code by the contract [`owner`](common/src/upgradable.rs).
- Still, **the [RedStonePriceFeed](./contracts/redstone-price-feed) contract Address for the feed id remains unchanged**

## What should be audited

### Rust files

The code-lines inside the following sections in `*/src/**/*.rs` files should be audited.

And the following **should not**:

* imports (use modules)
* tests and dev utility (code under `#[cfg(feature = "dev")]`and `#cfg[(test)]`).
* Code comments
* Empty lines
* Code inside test files inside `*/test/**` directories

### Other files

* We suggest to read `**/README.md`
* We suggest to audit Dependencies inside `**/Cargo.toml` files

