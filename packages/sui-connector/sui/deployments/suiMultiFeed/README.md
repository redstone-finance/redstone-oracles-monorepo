## Addresses

* package_id: `0xbd6c028d49d92e7e7f5cf268a2c91c0551f20a3d1f79d27d02482a71a9eb6ac3`
* adapter_id: `0x22794c3a37c5320e5acb6b9cdba6e256bc08867e9de8afd2a4b5d8ea7061fea3`

### Price feeds

Immutable packages (no `UpgradeCap`), each reading a single feed from the adapter above.

| Feed | Package / module  | package_id                                                           |
|------|-------------------|----------------------------------------------------------------------|
| BTC  | `price_feed_btc`  | `0xceae9ac4004d017a43635c8d4ea117488c8bea5635c1f0020c9c0d20edfebfe8` |
| SUI  | `price_feed_sui`  | `0xb254eb3ee701473295a54e14bedd930f90705b1802474830c5dd631e46e6fabe` |
| USDC | `price_feed_usdc` | `0x39ea428cd08a5e38e9a8caa18b481fea7b330e1af88b43d2777f62b081331b8e` |


## Reading on chain

### Prerequisite
Add RedStone price adapter to your Move.toml
```toml
[dependencies]
redstone_price_adapter = { git = "https://github.com/redstone-finance/redstone-oracles-monorepo", subdir = "packages/sui-connector/sui/deployments/suiMultiFeed/price_adapter", rev = "main" }
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

## Reading through price feed packages

### Prerequisite
Add RedStone price adapter and the price feeds you need to your Move.toml
```toml
[dependencies]
redstone_price_adapter = { git = "https://github.com/redstone-finance/redstone-oracles-monorepo", subdir = "packages/sui-connector/sui/deployments/suiMultiFeed/price_adapter", rev = "main" }
price_feed_btc = { git = "https://github.com/redstone-finance/redstone-oracles-monorepo", subdir = "packages/sui-connector/sui/deployments/suiMultiFeed/price_feed_BTC", rev = "main" }
price_feed_sui = { git = "https://github.com/redstone-finance/redstone-oracles-monorepo", subdir = "packages/sui-connector/sui/deployments/suiMultiFeed/price_feed_SUI", rev = "main" }
price_feed_usdc = { git = "https://github.com/redstone-finance/redstone-oracles-monorepo", subdir = "packages/sui-connector/sui/deployments/suiMultiFeed/price_feed_USDC", rev = "main" }
```

### Read Price and Timestamp
Every feed package has a single module named after the package, e.g. `price_feed_btc::price_feed_btc`.
Values have 8 decimals, timestamps are in ms.
```rust
use redstone_price_adapter::price_adapter::PriceAdapter;

public fun btc_price_and_timestamp(price_adapter: &PriceAdapter): (u256, u64) {
    price_feed_btc::price_feed_btc::price_and_timestamp(price_adapter)
}
```

Besides `price_and_timestamp`, each feed module provides `read_price`, `read_price_data`,
`get_data_feed_id`, `description` and `decimals`.

See [price_feed_example](./price_feed_example/sources/example.move) for a package reading all of the feeds.

### Reading from cli
```bash
sui client ptb \
  --move-call 0xceae9ac4004d017a43635c8d4ea117488c8bea5635c1f0020c9c0d20edfebfe8::price_feed_btc::price_and_timestamp @0x22794c3a37c5320e5acb6b9cdba6e256bc08867e9de8afd2a4b5d8ea7061fea3 \
  --dev-inspect
```

## Reading from cli

Assuming @package is address of the package with above functions you can read price and timestamp from command line with:

```bash
sui client call \
  --function price_and_timestamp \
  --module price_adapter --package 0xbd6c028d49d92e7e7f5cf268a2c91c0551f20a3d1f79d27d02482a71a9eb6ac3 --args 0x22794c3a37c5320e5acb6b9cdba6e256bc08867e9de8afd2a4b5d8ea7061fea3 --args 0x4c4254435f46554e44414d454e54414c00000000000000000000000000000000 \
  --dev-inspect

```

Example call on original price_adapter contract:
```bash
sui client call \
  --function price_and_timestamp \
  --module price_adapter --package 0xbd6c028d49d92e7e7f5cf268a2c91c0551f20a3d1f79d27d02482a71a9eb6ac3 --args 0x22794c3a37c5320e5acb6b9cdba6e256bc08867e9de8afd2a4b5d8ea7061fea3 --args 0x4c4254435f46554e44414d454e54414c00000000000000000000000000000000 \
  --dev-inspect
```
