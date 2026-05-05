# Solana Contracts — general assumptions

<!-- TOC -->

- [Solana Contracts — general assumptions](#solana-contracts--general-assumptions)
  - [PriceAdapter](#priceadapter)
    - [Feed accounts](#feed-accounts)

## PriceAdapter

- The [PriceAdapter](./redstone-solana-price-adapter/README.md) contract is updated from one or more off-chain processes.
- The data are written to a [`PriceData`](./redstone-solana-price-adapter/src/state.rs) account created per Feed id.
- The contract can be read by one of `view` functions.
- The parameters` update doesn't change the contract code
- Logic update requires changing the code.
  - Still, **the account [`PriceData`](./redstone-solana-price-adapter/src/state.rs) ID remains unchanged**
    and is readable.

### Feed accounts

The list of feeds is moved to the RedStone app: https://app.redstone.finance/push-feeds?networks=solana&testnets=true
