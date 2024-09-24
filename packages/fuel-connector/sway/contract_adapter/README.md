# RedStone Oracles integration with Fuel

## 💡 How RedStone Oracles work with Fuel

_RedStone Oracles_ use an alternative design of providing oracle data to smart contracts. Instead of constantly
persisting data on the contract's storage (by data providers), the information is brought on-chain only when needed
(by end users).
Until that moment data remains in the decentralized cache layer, which is powered by RedStone light cache gateways and
streamr data broadcasting protocol. Data is transferred to the contract by end users, who should attach signed data
packages to their function invocations. The information integrity is verified on-chain through signature checking.

To learn more about _RedStone Oracles_ design, go to the [RedStone docs](https://docs.redstone.finance/docs/introduction)

## 📄 Smart Contracts

### Prices.sway

- Sample oracle contract that consumes _RedStone Oracles_ data [prices.sw](src/prices.sw) written in sway version
  0.63.x.

#### ⨐ initializer

```rust
fn init(signers: Vec<b256>, signer_count_threshold: u64, updaters: Vec<Identity>)
```

As mentioned above, signature checking is verifying the data packages transferred to the contract.
To be counted to achieve the `signer_count_threshold`, the signer signing the passed data
should be one of the `signers` passed in the initializer.
There is also needed `signer_count_threshold` to be passed.

That initializer can be invoked only by the owner or by anyone when no owner was previously set.
Contract can be re-initialized by later invocations of the initializer.
The data can be written to the contract by the contract owner of by one of passed `updaters`.

That's a `#[storage(write)]` function - it consumes GAS and modifies the contract's storage, so must be paid by ETHs.

In the function parameters below, each `feed_id` is a string encoded to `u256` which means, that's a value
consisting of hex-values of the particular letters in the string. For example:
`ETH` as a `u256` is `0x455448` in hex or `4543560` in decimal,
as `256*256*ord('E')+256*ord('T')+ord('H')`.
<br />
📟 You can use: `feed_id = hexlify(toUtf8Bytes(feed_string))` to convert particular values or
the https://cairo-utils-web.vercel.app/ endpoint<br />

The value `payload` is passed as an array of bytes representing the packed RedStone payload. Each byte of the
payload is a single `u64`.
<br />
📚 See RedStone data-packing: https://docs.redstone.finance/img/payload.png
and the [Sample payload](#-sample-payload) section below.

#### ⨗ get_prices

```rust
fn get_prices(feed_ids: Vec<u256>, payload: Vec<u64>) -> Vec<u256>
```

The function processes on-chain the `payload` passed as an argument
and returns an array of aggregated values of each feed passed as an identifier inside `feed_ids`.

That's just a `#[storage(read)]` function - it consumes GAS but doesn't modify the contract's storage.

#### ⨒ write_prices

```rust
fn write_prices(feed_ids: Vec<u256>, payload: Vec<u64>) -> Vec<u256>
```

Besides on-the-fly processing, there is also a function that processes the `payload` on-chain.
This function saves the aggregated values to the contract's storage and returns them as an array.
The values persist in the contract's storage and then can be read by using `read_prices` function.
The timestamp of the last saved data can be retrieved using the `read_timestamp` function.
That's a `#[storage(write)]` function - it consumes GAS and modifies the contract's storage, so must be paid by ETHs.

📖 See how it works on: https://fuel-showroom.redstone.finance/

#### ⨗ read_prices

```rust
fn read_prices(feed_ids: Vec<u256>) -> Vec<u256>
```

The function reads the values persisting in the contract's storage and returns an array corresponding to the
passed `feed_ids`.
The function doesn't modify the storage and can read only aggregated values of the `feed_ids` saved by
using `write_prices` function.

That's just a `#[storage(read)]` function - it consumes GAS but doesn't modify the contract's storage.

#### ∮ read_timestamp

```rust
fn read_timestamp() -> u64
```

Returns the timestamp of data last saved/written to the contract's storage by using `write_prices` function.

That's just a `#[storage(read)]` function - it consumes GAS but doesn't modify the contract's storage.

## 📖 Sample payload

See [here](../README.md#preparing-sample-data), how to generate it.

Then the hex response is necessary to be split to single bytes, for example, by using `Array.from(arrayify(payloadHex))`
functions of `ethers` node package.

📖 See: [README.md](../README.md) to see the environment possibilities and sample scripts invoking the functions.

To have defined your custom data-service id and signers, [contact us](#contact).

## ⚠ Possible transaction failures

- The number of signers recovered from the signatures matched with `addresses` passed in the initializer
  must be greater or equal that the `signer_count_threshold` in the constructor, for each feed.
  - Otherwise, it panics then with the `0x2710_0000 = 655360000` error, increased by the first index of the passed
    feed which has broken the validation.
  - The number of signers for that data feed is presented in logs.
- The timestamp of data-packages must be not older than 15 minutes in relation to the `block_timestamp`.
  - Otherwise, it panics then with the `0x9C40_0000 = 2621440000` error, increased by the first index of the payload's
    data package which has broken the validation, increased additionally by `1000` if the package is older than
    expected and `2000` if its timestamp is too ahead in the future.
  - The timestamp of that data package and `block_timestamp` are presented in logs.
- The `init` & `write_prices` functions consume gas and must be paid by ETHers. The data are available on the contract
  just after the transaction successes.

## 🙋‍Contact

Please feel free to contact us on [Discord](https://redstone.finance/discord) or email to core@redstone.finance