
# RedStone oracles integration with Fuel

## 💡 How RedStone oracles work with Fuel

RedStone oracles use an alternative design of providing oracle data to smart contracts. Instead of constantly persisting data on the contract's storage (by data providers), the information is brought on-chain only when needed (by end users). Until that moment data remains in the decentralised cache layer, which is powered by RedStone light cache gateways and streamr data broadcasting protocol. Data is transferred to the contract by end users, who should attach signed data packages to their function invocations. The information integrity is verified on-chain through signature checking.

To learn more about RedStone oracles design go to the [RedStone docs](https://docs.redstone.finance/docs/introduction)

## 📄 Smart Contracts

### Prices.sway
- Sample oracle contract that consumes RedStone oracles data [prices.sw](src/prices.sw) written in sway version 0.35.x.

#### ⨐ initializer
```
fn init(signers: Vec<b256>, signer_count_threshold: u64, skip_setting_owner: u64,)
```

As mentioned above, the data packages transferred to the contract are being verified by signature checking.
To be counted to achieve the ```signer_count_threshold```, the signer signing the passed data
should be one of the ```signers``` passed in the initializer.
There is also needed ```signer_count_threshold``` to be passed.

When the `skip_setting_owner` flag is set to `0` (which means 'perform setting the owner'), the contract becomes owned
by the function invoker.
To avoid that and to have the contract owned by no-one, the `skip_setting_owner` should be set to `1`.

That initializer can be invoked only by the owner or by anyone when no owner was previously set.
Contract can be re-initialized by subsequent invocations of the initializer.

That's a `#[storage(write)]` function - it consumes GAS and modifies the contract's storage, so must be paid by ETHs.

In the function parameters below, each ```feed_id``` is a string encoded to `U256` which means,  that's a value consisting of hex-values of the particular letters in the string. For example:
```ETH``` as a ```U256```'s felt is ```0x455448``` in hex or ```4543560``` in decimal, as ```256*256*ord('E')+256*ord('T')+ord('H')```.
<br />
📟 You can use: `feed_id = hexlify(toUtf8Bytes(feed_string)))` to convert particular values or the https://cairo-utils-web.vercel.app/ endpoint<br />

The value ```payload``` is passed as an array of bytes representing the packed RedStone payload. Each byte of the payload is a single `u64`.
<br />
📚 See RedStone data-packing: https://docs.redstone.finance/docs/smart-contract-devs/how-it-works
and the [Sample payload](#-sample-payload) section below.

Due to the sway limitations in typescript library, where is no possibility to return a `Vec`, the result is a constant length array of 50 `U256` elements.

#### ⨗ get_prices
```
fn get_prices(feed_ids: Vec<U256>, payload: Vec<u64>) -> [U256; 50]
```

The function processes on-chain the ```payload``` passed as an argument 
and returns an array of aggregated values of each feed passed as an identifier inside ```feed_ids```.

That's just a `#[storage(read)]` function - it consumes GAS but doesn't modify the contract's storage.

#### ⨒ write_prices

```
fn write_prices(feed_ids: Vec<U256>, payload: Vec<u64>) -> [U256; 50]
```

Regardless of the on-fly processing, there also exists a function for processing the ```payload``` on-chain, but saving/writing 
the aggregated values to the contract's storage and then returning them as an array. The values persist in the contract's storage
and then can be read by using ```read_prices``` functions. 
The timestamp of data last saved/written to the contract is able to read by using the ```read_timestamp``` function.
That's a `#[storage(write)]` function - it consumes GAS and modifies the contract's storage, so must be paid by ETHs.

📖 See how it works on: https://fuel-showroom.redstone.finance/

#### ⨗ read_prices

```
fn read_prices(feed_ids: Vec<U256>) -> [U256; 50]
```

The function reads the values persisting in the contract's storage and returns an array corresponding to the passed ```feed_ids```.
The function doesn't modify the storage and can read only aggregated values of the ```feed_ids``` saved by using ```write_prices``` function.

That's just a `#[storage(read)]` function - it consumes GAS but doesn't modify the contract's storage.


#### ∮ read_timestamp

```
fn read_timestamp() -> u64 
```

Returns the timestamp of data last saved/written to the contract's storage by using ```write_prices``` function.

That's just a `#[storage(read)]` function - it consumes GAS but doesn't modify the contract's storage.

## 📖 Sample payload

The sample data passed to the contract deployed for the showroom/sample can be fetched by using:
https://d33trozg86ya9x.cloudfront.net/data-packages/payload?data-packages/payload?unique-signers-count=1&data-service-id=redstone-rapid-demo&format=hex
That's an example endpoint for `redstone-rapid-demo` data-service id, also for the sample value of the signer-address that can be used for the initializer (`0xf786a909D559F5Dee2dc6706d8e5A81728a39aE9`)

Then the hex response is needed to be split to single bytes, for example by using `Array.from(arrayify(payloadHex))`
functions of ```ethers``` or ```starknet``` node packages.

📟 You can use: [Makefile](../../../protocol/scripts/payload-generator/Makefile) by
invoking ```make DATA_NAME=[name] prepare_data``` or
directly from the [payload-generator](../../../protocol/scripts/payload-generator/) environment directory where `[name]`
is a string you wish.

📖 See: [README.md](../README.md) to see the environment possibilities and sample scripts invoking the functions.

[//]: # (You can fetch also the utf-encoded raw-bytes format of the payload by using: https://d33trozg86ya9x.cloudfront.net/data-packages/payload?data-packages/payload?unique-signers-count=1&data-service-id=redstone-rapid-demo&format=raw)

To have defined your custom data-service id and signers, [contact us](#contact).

## ⚠ Possible transaction failures

* The number of signers recovered from the signatures matched with ```addresses``` passed in the initializer 
must be greater or equal that the ```signer_count_threshold``` in the constructor, for each feed. 
  * Otherwise, it panics then with the `0x2710_0000 = 655360000` error, increased by the first index of the passed feed which has broken the validation.
  * The number of signers for that data feed is presented in logs.
* The timestamp of data-packages must be not older than 15 minutes in relation to the ```block_timestamp```.
  * Otherwise, it panics then with the `0x9C40_0000 = 2621440000` error, increased by the first index of the payload's
    data package which has broken the validation, increased additionally by `1000` if the package is older than expected
    and `2000` if its timestamp is too future.
  * The timestamp of that data package and `block_timestamp` are presented in logs.
* The `init` & `write_prices` functions consume gas and must be paid by ETHers. The data are available on the contract just after the transaction successes.

## 🙋‍Contact

Please feel free to contact us on [Discord](https://redstone.finance/discord) or send email to core@redstone.finance
