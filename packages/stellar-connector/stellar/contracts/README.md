
[//]: # (TODO: change to rust_sdk_3 docs)

# RedStone integration with Stellar

<!-- TOC -->
* [RedStone integration with Stellar](#redstone-integration-with-stellar)
  * [💡 How RedStone work with Stellar](#-how-redstone-work-with-stellar)
  * [✨ General parameter disclaimer](#-general-parameter-disclaimer)
  * [📄 Smart Contracts](#-smart-contracts)
    * [RedStone Adapter](#redstone-adapter)
      * [⨐ init](#-init)
      * [⨗ get_prices](#-get_prices)
      * [⨒ write_prices](#-write_prices)
      * [⨗ read_prices](#-read_prices)
      * [∮ read_timestamp](#-read_timestamp)
      * [∮ read_price_data](#-read_price_data)
  * [⚠ Possible transaction failures](#-possible-transaction-failures)
    * [RedStone Price Feed](#redstone-price-feed)
      * [⨐ init](#-init-1)
      * [∮ get_price_and_timestamp](#-get_price_and_timestamp)
  * [🙋‍Contact](#contact)
<!-- TOC -->

## 💡 How RedStone work with Stellar

_RedStone_ use an alternative design of providing oracle data to smart contracts. Instead of constantly
persisting data on the contract's storage (by data providers), the information is brought on-chain only when needed
(by end users). Until that moment data remains in the decentralized cache layer, which is powered by RedStone light
cache gateways. Data is transferred to the contract by end users, who should
attach signed data packages to their function invocations. The information integrity is verified on-chain through
signature checking.

To learn more about _RedStone_ design, go to
the [RedStone docs](https://docs.redstone.finance/docs/introduction)

## ✨ General parameter disclaimer

In the function parameters below, each `feed_id` is a `soroban_sdk::String`.
The value of `feed_ids` should be passed as a `soroban_sdk::Vec` of `soroban_sdk::String`s.

The value of `payload` is a `soroban_sdk::Bytes` - a list of `u8`s representing the serialized RedStone payload.
<br />
📚 See RedStone data-packing: https://docs.redstone.finance/img/payload.png

## 📄 Smart Contracts

### [RedStone Adapter](redstone-adapter)

Sample oracle contract that consumes _RedStone_ data, written in Rust.

The example-testnet address of the implementation is exposed in the [redstone_adapter-id.testnet](../redstone_adapter-id.testnet) file,
and [redstone_adapter-id.mainnet](../../deployments/stellarMultiFeed/redstone_adapter-id.mainnet) for mainnet.

#### ⨐ init

```rust
pub fn init(env: &Env, owner: Address) -> Result<(), Error>
```

The `init` function must be executed once during the contract deploying process.
The function sets the `owner` of the contract, who can later upgrade its code.

#### ⨗ get_prices

```rust
pub fn get_prices(env: &Env, feed_ids: Vec<String>, payload: Bytes) -> Result<(u64, Vec<U256>), Error>
```

The function processes on-chain the `payload` passed as an argument and returns a tuple
representing the min timestamp of the data and the aggregated values
(of each feed passed as an identifier inside `feed_ids`).

The method doesn't modify the contract's storage.

#### ⨒ write_prices

```rust
pub fn write_prices(env: &Env, updater: Address, feed_ids: Vec<String>, payload: Bytes, ) -> Result<(u64, Vec<(String, U256)>), Error> 
```

Besides on-the-fly processing, there is also a function that processes the `payload` on-chain.
This function saves the aggregated values to the contract's storage, if they met the [criteria](https://docs.redstone.finance/rust/redstone/rust_sdk_2/src/redstone/contract/verification.rs.html).
The values persist in the contract's storage and then can be read by using [`read_prices`](#-read_prices) function.
The timestamp of data last saved/written to the contract is able to read by using
the [`read_timestamp`](#-read_timestamp) function.

The updater address must be passed and depending on their status [(trusted/untrusted)](https://docs.redstone.finance/rust/redstone/rust_sdk_2/src/redstone/contract/verification.rs.html),
additional restriction may be applied.

📚 See [config.rs](redstone-adapter/src/config.rs) and [updater verification inside the Rust-SDK](https://docs.redstone.finance/rust/redstone/rust_sdk_2/src/redstone/contract/verification.rs.html)

The method returns the tuple value similar as the [`get_prices`](#-get_prices) function, but it returns only written values.

The method modifies the contract's storage.

#### ⨗ read_prices

```rust
pub fn read_prices(env: &Env, feed_ids: Vec<String>) -> Result<Vec<U256>, Error>    
```

The function reads the values persisting in the contract's storage and returns a `List` of `U256`-values corresponding
to the passed `feed_ids`.
The function can read only aggregated values of the `feed_ids` saved by using [`write_prices`](#-write_prices) function.

The method doesn't modify the contract's storage.

#### ∮ read_timestamp

```rust
pub fn read_timestamp(env: &Env, feed_id: String) -> Result<u64, Error> 
```

Returns the timestamp of data last saved/written to the contract's storage by using [`write_prices`](#-write_prices)
function.

The method doesn't modify the contract's storage.

#### ∮ read_price_data

```rust
pub fn read_price_data(env: &Env, feed_ids: Vec<String>) -> Result<Vec<PriceData>, Error>
```

The function reads the values persisting in the contract's storage and returns a `PriceData`s containing a `U256`-value
(corresponding to the passed `feed_ids`) and the timestamps of data last saved/written to the contract's storage by
using [`write_prices`](#-write_prices) function

The method doesn't modify the contract's storage.

## ⚠ Possible transaction failures

The transaction could have returned an error with one of codes defined in [docs](https://docs.redstone.finance/rust/redstone/rust_sdk_2/src/redstone/network/error.rs.html)

### [RedStone Price Feed](redstone-price-feed)

A consumer of the data saved in [Price Adapter](#redstone-adapter).

The example-testnet addresses of the implementations are exposed in the [redstone_price_feed-ETH-id.testnet](../redstone_price_feed-ETH-id.testnet) and [redstone_price_feed-BTC-id.testnet](../redstone_price_feed-BTC-id.testnet) files.
For mainnet: [redstone_price_feed-ETH-id.mainnet](../../deployments/stellarMultiFeed/redstone_price_feed-ETH-id.mainnet) AND [redstone_price_feed-BTC-id.mainnet](../../deployments/stellarMultiFeed/redstone_price_feed-BTC-id.mainnet)

#### ⨐ init

```rust
pub fn init(env: &Env, owner: Address, feed_id: String) -> Result<(), Error>
```

The `init` function must be executed once during the contract deploying process.
The function sets the `owner` of the contract, who can later upgrade its code.

There is also needed the `feed_id` the data will be fetched for.

#### ∮ get_price_and_timestamp

```rust
pub fn read_price_data(env: &Env) -> Result<PriceData, Error>
```

The function reads the values persisting in the contract's storage and returns a `PriceData` as for [`read-price-data`](#-read_price_data)
* for the adapter the data are saved in (see [config.rs](redstone-price-feed/src/config.rs))
* and for the `feed_id` initialized during [`init`](#-init-1).

## 🙋‍Contact

Please feel free to contact us on [Discord](https://redstone.finance/discord) or email core@redstone.finance
