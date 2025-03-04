## Addresses

* package_id: `0xc14f5281c41da172c1b72d07e3ae79e9ad1f12b6444b7bd23343b63bcf43ee46`
* adapter_id: `0x22794c3a37c5320e5acb6b9cdba6e256bc08867e9de8afd2a4b5d8ea7061fea3`


## Reading on chain

### Prerequisite
Add RedStone price adapter to your Move.toml
```toml
[dependencies]
redstone_price_adapter = { git = "https://github.com/redstone-finance/redstone-oracles-monorepo", subdir = "packages/sui-connector/sui/deployments/suiMultifeed/price_adapter", rev = "main" }
```
### imports
```rust
use redstone_price_adapter::price_adapter::PriceAdapter;


/// LBTC_FUNDAMENTAL
const FEED_ID: vector<u8> = x"4c4254435f46554e44414d454e54414c00000000000000000000000000000000";
```

### Read Price
You will get u256 value representing price of the given feed. Value has 8 decimals.
```rust
public fun read_price(price_adapter: &PriceAdapter): u256 {
    price_adapter.price_data(FEED_ID).price()
}
```

### Read Timestamp
You will get u64 value representing timestamp in ms of the price value.
```rust
public fun read_timestamp(price_adapter: &PriceAdapter): u64 {
    price_adapter.price_data(FEED_ID).timestamp()
}
```


### Read Price and Timestamp
You will get both price and timestamp.
```rust
public fun price_and_timestamp(price_adapter: &PriceAdapter): (u256, u64) {
    price_adapter.price_data(FEED_ID).price_and_timestamp()
}
```

## Reading from cli

Assuming @package is address of the package with above functions you can read price and timestamp from command line with:

```bash
sui client call \
  --function price_and_timestamp \
  --module price_adapter --package 0xc14f5281c41da172c1b72d07e3ae79e9ad1f12b6444b7bd23343b63bcf43ee46 --args 0x22794c3a37c5320e5acb6b9cdba6e256bc08867e9de8afd2a4b5d8ea7061fea3 --args 0x4c4254435f46554e44414d454e54414c00000000000000000000000000000000 \
  --dev-inspect

```

Example call on original price_adapter contract:
```bash
sui client call \
  --function price_and_timestamp \
  --module price_adapter --package 0xc14f5281c41da172c1b72d07e3ae79e9ad1f12b6444b7bd23343b63bcf43ee46 --args 0x22794c3a37c5320e5acb6b9cdba6e256bc08867e9de8afd2a4b5d8ea7061fea3 --args 0x4c4254435f46554e44414d454e54414c00000000000000000000000000000000 \
  --dev-inspect
```
