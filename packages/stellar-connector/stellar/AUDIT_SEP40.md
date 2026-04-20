# Stellar SEP-40 Oracle — Audit guide

<!-- TOC -->
* [Stellar SEP-40 Oracle — Audit guide](#stellar-sep-40-oracle--audit-guide)
  * [Repository](#repository)
  * [Code description](#code-description)
  * [General assumptions](#general-assumptions)
  * [What was added](#what-was-added)
    * [New contract: redstone-sep-40](#new-contract-redstone-sep-40)
    * [New module: common/redstone_adapter.rs](#new-module-commonredstone_adapterrs)
  * [What was modified](#what-was-modified)
    * [redstone-adapter](#redstone-adapter)
  * [What should be audited](#what-should-be-audited)
    * [Rust files](#rust-files)
    * [Other files](#other-files)
<!-- TOC -->

## Repository

* The repository: https://github.com/redstone-finance/redstone-oracles-monorepo
* The base CommitId (just before SEP-40 changes): [will be prepared for the particular version — `b5b589abafec59a8b1be0662bc725340da044fbe`]
* The target CommitId: [will be prepared for the particular version]
* Path: `packages/stellar-connector/stellar`

The direct path should look like:
[https://github.com/redstone-finance/redstone-oracles-monorepo/tree/[COMMIT_ID]/packages/stellar-connector/stellar](https://github.com/redstone-finance/redstone-oracles-monorepo/tree/main/packages/stellar-connector/stellar)

## Code description

* Prior contracts: [contracts/README.md](./contracts/README.md)
* SEP-40 standard: https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0040.md
* General RedStone architecture: https://docs.redstone.finance/docs/architecture/
* Push model: https://docs.redstone.finance/docs/dapps/redstone-push/

## General assumptions

- `RedStoneSep40` is a read-only SEP-40 oracle. It never writes prices — it delegates all data reads to the existing `RedStoneAdapter` contract via cross-contract calls.
- The underlying price data continues to be written by off-chain processes to `RedStoneAdapter`, unchanged.
- `RedStoneSep40` translates between RedStone's feed ID strings (e.g. `"ETH"`) and SEP-40 `Asset` types, and normalizes decimal precision.
- All prices returned by `RedStoneSep40` are scaled to `decimals()`, which is the maximum precision across all registered feeds (default 8). Feeds with fewer decimals are scaled up; no feed is scaled down.
- Contract ownership and upgradeability follow the same pattern as other contracts in this repository — see [`common/src/ownable.rs`](./common/src/ownable.rs) and [`common/src/upgradable.rs`](./common/src/upgradable.rs).

## What was added

### New contract: redstone-sep-40

Path: [`contracts/redstone-sep-40/src/`](./contracts/redstone-sep-40/src/)

Implements the SEP-40 `PriceFeedTrait` on top of the existing `RedStoneAdapter`.

**`lib.rs`** — main contract entry point

`RedStoneSep40` struct with two `#[contractimpl]` blocks:

Admin interface (owner-gated):
- `__constructor(env, owner, base_asset, feed_mappings)` — initializes base asset, feed mappings, and owner
- `add_feed(env, feed_mapping)` — registers a new feed→asset mapping
- `remove_feed(env, feed)` — removes an existing mapping
- `update_feed(env, feed_mapping)` — atomically replaces a mapping (remove + add)
- `change_owner`, `accept_ownership`, `cancel_ownership_transfer` — two-step ownership transfer
- `extend_entries_ttl` — extends TTL on all persistent storage entries

SEP-40 interface (`PriceFeedTrait`):
- `base()` — returns the configured base asset
- `assets()` — returns all registered assets
- `decimals()` — returns `max_decimals`, the maximum precision across all feeds
- `resolution()` — returns `RESOLUTION` (86400, i.e. 24 hours in seconds, matching RedStone's heartbeat interval)
- `lastprice(asset)` — calls `try_read_price_data_for_feed` on adapter; converts to SEP-40 format
- `price(asset, timestamp)` — fetches full history (`u32::MAX` records), finds the entry whose `package_timestamp / 1_000 == timestamp`
- `prices(asset, records)` — fetches the latest `records` entries from adapter history; converts each

Private:
- `get_prices(env, asset, records)` — resolves asset→feed, calls `try_read_price_history`

---

**`config.rs`** — compile-time constants

```text
ADAPTER_ADDRESS: &str  — address of the RedStoneAdapter contract
DECIMALS: u32 = 8      — default decimal precision
ONE_SEC: Duration      — used for timestamp conversion (ms → s)
RESOLUTION: u32        — 86400 (24 hours in seconds), the heartbeat interval
```

---

**`error.rs`** — contract-specific errors

```text
Sep40Error::DuplicatedFeed  = 100
Sep40Error::DuplicatedAsset = 101
Sep40Error::FeedNotFound    = 102
```

All three map to `Error::from_contract_error(code)`.

---

**`storage.rs`** — storage keys and `EnvExt` trait

`StorageKey` enum:
```text
BaseAsset                — instance storage, the base Asset
MaxDecimals              — instance storage, u32 max decimals across all feeds
Assets                   — persistent, Vec<Asset> of all registered assets
FeedToAsset(String)      — persistent, feed ID → Asset
AssetToFeed(Asset)       — persistent, Asset → feed ID (reverse index)
FeedDecimals(String)     — persistent, per-feed decimal precision
```

`EnvExt` trait (implemented on `Env`) exposes typed accessors for each key. `extend_all_entries_ttl` iterates all registered assets to extend TTL on every mapping entry.

---

**`feed_map.rs`** — `FeedMap` builder for consistent feed registration

`FeedMap::with(env, closure)` loads current state (assets list + max_decimals), runs the closure, then writes back. This ensures all mutations to feed mappings are atomic from the perspective of the in-memory state.

`add` checks for duplicated feed and duplicated asset before inserting. `remove` calls `detach`, which:
1. Removes the asset from the assets list
2. Removes both directions of the mapping from storage
3. If the removed feed had the current `max_decimals`, recomputes max by iterating remaining feeds

`recompute_max_decimals` iterates all assets, resolves each to a feed, reads per-feed decimals, and returns the maximum.

---

**`utils.rs`** — stateless helpers

`price_data_to_sep_40(price_data, feed_decimals, max_decimals) -> Option<Sep40PriceData>`:
- Converts `U256` price to `i128` (returns `None` on overflow)
- If `feed_decimals < max_decimals`, multiplies by `10^(max_decimals - feed_decimals)` (checked arithmetic, returns `None` on overflow)
- Converts timestamp: `package_timestamp / ONE_SEC.as_millis()` (milliseconds → seconds)

`asset_eq(a, b)` — structural equality for `Asset` (variants must match; `Stellar` compares addresses, `Other` compares symbols)

`get_adapter_client(env)` — constructs `RedStoneAdapterClient` from the hardcoded `ADAPTER_ADDRESS`

---

### New module: common/redstone_adapter.rs

Path: [`common/src/redstone_adapter.rs`](./common/src/redstone_adapter.rs)

Extracted from `redstone-price-feed` (where it was previously defined inline) into `common` so it can be shared across contracts.

```rust
#[contractclient(name = "RedStoneAdapterClient")]
pub trait RedStoneAdapter {
    fn read_price_data_for_feed(feed_id: String) -> Result<PriceData, Error>;
    fn read_price_history(feed_id: String, limit: u32) -> Result<Vec<PriceData>, Error>;
}

pub trait RedStoneAdapterTrait {
    fn read_price_data_for_feed(env: &Env, feed_id: String) -> Result<PriceData, Error>;
    fn read_price_history(env: &Env, feed_id: String, limit: u32) -> Result<Vec<PriceData>, Error>;
}
```

`RedStoneAdapter` (with `#[contractclient]`) generates the `RedStoneAdapterClient` struct used by both `redstone-sep-40` and `redstone-price-feed` for cross-contract calls.

`RedStoneAdapterTrait` is the internal trait implemented by `RedStoneAdapter` contract (`redstone-adapter/src/lib.rs`).

Note: `#[contractclient]` generates two methods per `fn name() -> Result<T, Error>`: `name` (unwraps and returns `T`) and `try_name` (returns `Result<Result<T, ConversionError>, Result<Error, InvokeError>>`). Both `redstone-sep-40` and `redstone-price-feed` use the `try_` variant to propagate errors correctly.

---

## What was modified

### redstone-adapter

**`env_extensions.rs`** (new file)

Before this feature, the adapter had no `env_extensions.rs`. It stored a single `PriceData` directly under the feed string key and had no price history.

This file introduces the `EnvExt` trait on `Env` and a new `PriceDataStorage` ring buffer abstraction. The storage layout becomes:

1. `StorageKey::Feed(feed)` → `PriceDataStorage` (ring buffer of historical `PriceData` entries)
2. `feed` (string key directly) → `PriceData` (latest entry, for O(1) lookup)

Both entries share the same TTL extension logic in `save_feed`.

Key methods:
- `get_data_for_feed(feed)` / `get_data_for_feed_or_default(feed)` — reads the ring buffer under `StorageKey::Feed`
- `get_latest_price_data_for_feed(feed) -> Option<PriceData>` — reads the latest entry directly from the feed string key
- `try_get_latest_price_data_for_feed(feed) -> Result<PriceData, Error>` — wraps above with `MISSING_STORAGE_ENTRY`
- `save_feed(feed, storage, latest)` — writes both the ring buffer and the latest entry

**`lib.rs`**

- The contract now exposes `read_price_history` (returning up to `limit` historical entries from the ring buffer) in addition to the existing read methods.
- `RedStoneAdapter` implements `RedStoneAdapterTrait` from `common`, making `read_price_data_for_feed` and `read_price_history` available via `RedStoneAdapterClient` for cross-contract calls.
- `update_feed` (private): reads `old_price_data` via `get_latest_price_data_for_feed` and writes via `save_feed(feed, storage, price_data)`.

**`event.rs`**

Minor disambiguation: `self.to_xdr(env)` replaced with `ToXdr::to_xdr(self, env)` to resolve ambiguity with other trait methods in scope.

---

## What should be audited

### Rust files

The code lines inside the following sections in `*/src/**/*.rs` files should be audited.

The following **should not** be audited:

* Imports (`use` modules)
* Tests and dev utility (code under `#[cfg(feature = "dev")]` and `#[cfg(test)]`)
* Code comments
* Empty lines
* Code inside `*/tests/**` directories

Primary focus areas:

| File | Reason |
| --- | --- |
| `contracts/redstone-sep-40/src/lib.rs` | New contract: full SEP-40 interface + admin interface |
| `contracts/redstone-sep-40/src/feed_map.rs` | Feed registration, duplicate checks, max_decimals recomputation |
| `contracts/redstone-sep-40/src/storage.rs` | Storage layout, TTL handling |
| `contracts/redstone-sep-40/src/utils.rs` | Price conversion, decimal scaling, overflow guards |
| `contracts/redstone-sep-40/src/error.rs` | Error codes |
| `contracts/redstone-adapter/src/env_extensions.rs` | Changed storage layout for latest price |
| `contracts/redstone-adapter/src/lib.rs` | `RedStoneAdapterTrait` impl, updated internal reads |
| `common/src/redstone_adapter.rs` | Cross-contract interface |

### Other files

* We suggest reading all `**/README.md` files
* We suggest auditing dependencies inside `**/Cargo.toml` files, particularly `contracts/redstone-sep-40/Cargo.toml`
