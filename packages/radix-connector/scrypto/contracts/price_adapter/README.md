# RedStone integration with Radix

<!-- TOC -->
* [RedStone integration with Radix](#redstone-integration-with-radix)
  * [💡 How RedStone work with Radix](#-how-redstone-work-with-radix)
  * [✨ General parameter type disclaimer](#-general-parameter-type-disclaimer)
  * [📄 Blueprints](#-blueprints)
    * [PriceAdapter](#priceadapter)
      * [⨐ instantiate](#-instantiate)
      * [⨗ get_prices](#-get_prices)
      * [⨒ write_prices](#-write_prices)
      * [⨗ read_prices](#-read_prices)
      * [∮ read_timestamp](#-read_timestamp)
      * [⨗ read_price_data](#-read_price_data)
  * [📖 Sample payload](#-sample-payload)
  * [⚠ Possible transaction failures](#-possible-transaction-failures)
  * [🙋‍Contact](#contact)
<!-- TOC -->

## 💡 How RedStone work with Radix

_RedStone_ use an alternative design of providing oracle data to smart contracts. Instead of constantly
persisting data on the contract's storage (by data providers), the information is brought on-chain only when needed
(by end users).
Until that moment data remains in the decentralized cache layer, which is powered by RedStone light cache gateways. Data is transferred to the contract by end users, who should attach signed data
packages to their function invocations. The information integrity is verified on-chain through signature checking.

To learn more about _RedStone_ design, go to
the [RedStone docs](https://docs.redstone.finance/docs/introduction)

## ✨ General parameter type disclaimer

* In the function parameters below, each `feed_id` is a `Vec<u8>` as the byte-representation of the string.
  The value of `feed_ids` should be passed as a serialized `Vec` of `Vec<u8>`s.
* The returning values for base (non `*_raw`) functions are `Decimal`s -
  the functions may fail when one of the values is overflowing the `Decimal` range `/ 10 ** 8` which is `~2 ** 165`.
* In that case you should use one `*._raw` function which returning values are encoded as `U256Digits`,
  represented each as four `u64`'s, to be properly represented in SBOR.
* The functions with `_trusted` suffix require proof-resource in the calling manifest
  (its address can be taken by using `get_trusted_updater_resource` function)
* The `payload` value is a `Vec` of `u8`s representing the serialized RedStone payload.

📚 See RedStone data-packing: https://docs.redstone.finance/img/payload.png and the [Sample payload](#-sample-payload)
section below.

📚 See also [types.rs](../../common/src/types.rs) to check which types are changed for the `resim` environment.

## 📄 Blueprints

### PriceAdapter

- Sample oracle contract that consumes _RedStone_ data
[price_adapter.rs](src/price_adapter.rs) written in scrypto version `1.3.0`.

#### ⨐ instantiate

That initializer instantiates the component.

```rust
pub fn instantiate(signer_count_threshold: u8, allowed_signer_addresses: Signers) -> Global<PriceAdapter>;
```

As mentioned above, signature checking is verifying the data packages transferred to the contract.
To be counted to achieve the `signer_count_threshold`, the signer signing the passed data
should be one of the `allowed_signer_addresses` passed in the initializer.
There is also needed `signer_count_threshold` to be passed.

#### ⨗ get_prices

```rust
pub fn get_prices(&self, feed_ids: Vec<Vec<u8>>, payload: Vec<u8>) -> (u64, Vec<Decimal>)

pub fn get_prices_raw(&self, feed_ids: Vec<Vec<u8>>, payload: Payload) -> (u64, Vec<RedStoneValue>)
```

The function processes on-chain the `payload` passed as an argument
and returns an array of aggregated values for each feed passed as an identifier inside `feed_ids`,
as well as the timestamp of the aggregated prices.

That function doesn't modify the contract's storage.

#### ⨒ write_prices

```rust
pub fn write_prices(&mut self, feed_ids: Vec<Vec<u8>>, payload: Payload) -> (u64, Vec<Decimal>)

pub fn write_prices_raw(&mut self, feed_ids: Vec<Vec<u8>>, payload: Payload) -> (u64, Vec<RedStoneValue>)

pub fn write_prices_trusted(&mut self, feed_ids: Vec<Vec<u8>>, payload: Payload) -> (u64, Vec<Decimal>)

pub fn write_prices_raw_trusted(&mut self, feed_ids: Vec<Vec<u8>>, payload: Payload) -> (u64, Vec<RedStoneValue>)
```

Besides on-the-fly processing, there is also a function that processes the `payload` on-chain.
This function saves the aggregated values to the contract's storage and returns them as an array.
The values persist in the contract's storage and then can be read by using `read_prices` function.
The timestamp of the saved data can be retrieved using the `read_timestamp` function.
The function also returns the saved timestamp and price values.

The functions without `_trusted` suffix are subjects for checking the min time interval between updates -
by default set to 40 seconds.
The functions with `_trusted` suffix require proof-resource in the calling manifest
(its address can be taken by using `get_trusted_updater_resource` function)

That function modifies the contract's storage.

#### ⨗ read_prices

```rust
pub fn read_prices(&self, feed_ids: Vec<Vec<u8>>) -> Vec<Decimal>

pub fn read_prices_raw(&self, feed_ids: Vec<Vec<u8>>) -> Vec<RedStoneValue>
```

The function reads the values persisting in the contract's storage and returns an array corresponding to the
passed `feed_ids`.
The function doesn't modify the storage and can read only aggregated values of the `feed_ids` saved by
using `write_prices` function.

That function doesn't modify the contract's storage.

#### ∮ read_timestamp

```rust
pub fn read_timestamp(&self)
```

Returns the timestamp of data last saved/written to the contract's storage by using `write_prices` function.

That function doesn't modify the contract's storage.

#### ⨗ read_price_data

```rust
pub fn read_price_data(&self, feed_ids: Vec<Vec<u8>>) -> Vec<PriceData>

pub fn read_price_data_raw(&self, feed_ids: Vec<Vec<u8>>) -> Vec<PriceDataRaw>
```

The function reads the values persisting in the contract's storage and returns an array of price data
corresponding to the passed `feed_ids`.
The function doesn't modify the storage and can read only aggregated values of the `feed_ids` saved by
using `write_prices` function.

That function doesn't modify the contract's storage.

See the [price_data.rs](./src/price_data.rs) file.

## 📖 Sample payload

See [here](../../README.md#preparing-sample-data), how to generate it.

Then the hex response is necessary to be split to single bytes, for example, by using `Array.from(arrayify(payloadHex))`
functions of `ethers` node package, and converted to SBOR, by using one of helpers functions like
defined [here](../../../src/radix/utils.ts).

## ⚠ Possible transaction failures

The transaction could have returned an error, one of the defined below:

- in the [redstone](https://github.com/redstone-finance/rust-sdk/blob/2.0.0/crates/redstone/src/network/error.rs) library
- in Price Adapter [specific](../../common/src/price_adapter_error.rs)

## 🙋‍Contact

Please feel free to contact us on [Discord](https://redstone.finance/discord) or email to core@redstone.finance
