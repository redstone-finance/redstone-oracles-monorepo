# Solana Contracts — general assumptions

<!-- TOC -->
* [Solana Contracts — general assumptions](#solana-contracts--general-assumptions)
  * [PriceAdapter](#priceadapter)
<!-- TOC -->

## PriceAdapter

* The [PriceAdapter](./price_adapter/README.md) contract is updated from one or more off-chain processes.
* The data are written to a [`PriceData`](./redstone-solana-price-adapter/src/state.rs) account created per Feed id.
* The contract can be read by one of `view` functions.
* The parameters` update doesn't change the contract code
* Logic update requires changing the code.
  * Still, **the account [`PriceData`](./redstone-solana-price-adapter/src/state.rs) ID remains unchanged**
  and is readable.

### Feed accounts

|                            | mainnet-beta                                 | testnet                                      | devnet                                       |
| -------------------------- | -------------------------------------------- | -------------------------------------------- | -------------------------------------------- |
| ETH                        | HPmPoq3eUTPePsDB5U4G6msu5RpeZHhMemc5VnqxQ9Lx | BsFkAfSgub54ZMHxZpCXqB3zpWXF8NwAswbuNX1Jq55g | 6bgjyNJ18vWGjw2qjjseSBaDK4QbJF8sjsHAhwy8EuBW |
| BTC                        | 74o5fhuMC33HgfUqvv2TdpYiKvEWfcRTS1E8zxK6ESjN | FbTaAY9o6MU3xZKXT65xE3wATNrxU7nTnZZPmg4gS9Ad | AhQGbBqhbcqJhV7WJ5GktjtjM7dHBPYv2uFhL7Cy7gzQ |
| BUIDL_SOLANA_FUNDAMENTAL   | ESxdEASDcYRN4ybnYNCJJuPHcF2SGJN1MypQq1yfY9Kz | x | x |
| BUIDL_SOLANA_DAILY_ACCRUAL | CPKJ57Kvxf8Xrz1o3hqBK52SqqEUAPp1NVdCK94bDGSX | x | x |
| ACRED_SOLANA_FUNDAMENTAL   | 6sK8czVw8Xy6T8YbH6VC8p5ovNZD2mXf5vUTv8sgnUJf | x | x |

