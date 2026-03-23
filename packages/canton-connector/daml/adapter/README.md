# RedStone Push Oracle in Canton

<!-- TOC -->
* [RedStone Push Oracle in Canton](#redstone-push-oracle-in-canton)
  * [💡 How RedStone Push Oracle works with Canton](#-how-redstone-push-oracle-works-with-canton)
  * [✨ General parameter disclaimer](#-general-parameter-disclaimer)
  * [📄 Smart Contracts](#-smart-contracts)
    * [RedStone Adapter](#redstone-adapter)
      * [⨗ GetPrices](#-getprices)
      * [⨒ WritePrices](#-writeprices)
      * [⨗ ReadPrices](#-readprices)
      * [∮ ReadPriceData](#-readpricedata)
      * [∮ GetUniqueSignerThreshold](#-getuniquesignerthreshold)
    * [RedStone PricePillFactory](#redstone-pricepillfactory)
      * [⨒ CreatePricePills](#-createpricepills)
      * [⨒ ArchivePricePills](#-archivepricepills)
    * [RedStone PricePill](#redstone-pricepill)
      * [∮ ReadData](#-readdata)
      * [∮ ReadPrice](#-readprice)
      * [∮ ReadTimestamp](#-readtimestamp)
      * [∮ ReadFeedId](#-readfeedid)
      * [∮ ReadDescription](#-readdescription)
      * [∮ IsDataStale](#-isdatastale)
      * [⨒ ArchivePill](#-archivepill)
  * [💊 PricePill lifecycle](#-pricepill-lifecycle)
  * [⚠ Possible transaction failures](#-possible-transaction-failures)
  * [🙋‍Contact](#contact)
<!-- TOC -->

## 💡 How RedStone Push Oracle works with Canton

![RedStonePricePill.png](RedStonePricePill.png)

_RedStone_ Push Oracle persists price data on the Canton ledger. An off-chain relayer periodically calls `WritePrices`
on the adapter contract, which processes the RedStone payload, verifies signatures, and stores aggregated values.
When a `PricePillFactory` is configured, `WritePrices` also creates individual `PricePill` contracts for each feed,
enabling consumers to read prices per feed without accessing the adapter directly.

To learn more about _RedStone_ design, go to
the [RedStone docs](https://docs.redstone.finance/docs/introduction)

## ✨ General parameter disclaimer

In the function parameters below, each `feedId` is a `RedStoneFeedId` (`[Int]`) — a list of ASCII character codes
(e.g., `ETH = [69, 84, 72]`, `BTC = [66, 84, 67]`).

The value of `payloadHex` is a hex-encoded `Text` representing the serialized RedStone payload.
<br />
📚 See RedStone data-packing: https://docs.redstone.finance/img/payload.png

The `currentTime` is the off-chain real-world timestamp, verified against the ledger time using
[`isLedgerTimeLE/GE`](https://docs.digitalasset.com/build/3.4/reference/daml/stdlib/DA-Time.html) functions.

## 📄 Smart Contracts

### [RedStone Adapter](./src/RedStoneAdapter.daml)

The main oracle contract that consumes _RedStone_ data, written in DAML.
It implements the [`IRedStoneAdapter`](../interface/src/IRedStoneAdapter.daml) interface.

#### ⨗ GetPrices

```haskell
nonconsuming choice GetPrices : RedStoneResult
  with
    feedIds : [RedStoneFeedId]
    currentTime : Time
    payloadHex : PayloadHex
  controller (view this).viewers
```

The choice processes on-chain the `payloadHex` passed as an argument and returns a `RedStoneResult` tuple
representing the aggregated values (of each feed passed inside `feedIds`) and the data timestamp.

The method doesn't modify the contract's storage.

#### ⨒ WritePrices

```haskell
nonconsuming choice WritePrices : ContractId IRedStoneAdapter
  with
    feedIds : [RedStoneFeedId]
    currentTime : Time
    payloadHex : PayloadHex
  controller (view this).updaters
```

Besides on-the-fly processing, this choice processes the `payloadHex` on-chain and saves the aggregated values
to the adapter's `feedData` storage. Only values with newer timestamps than existing data are written.
When a `PricePillFactory` is configured, it also creates `PricePill` contracts for each updated feed.

The choice first checks if any values pass timestamp validation. If no new values exist, it returns `self` without
any state change. Otherwise, it delegates to an internal consuming `WritePricesConsuming` choice that atomically:
re-verifies the payload, creates pills via the factory, archives the old adapter, and creates a new one with updated data.
The consuming choice takes the same payload parameters and performs full verification — it cannot be called with
arbitrary data.

The method modifies the contract's storage (only when new values are written).

📚 See [Verify.daml](./src/Verify.daml) for timestamp validation logic and [ProcessPayload.daml](./src/ProcessPayload.daml) for payload processing and pill creation.

#### ⨗ ReadPrices

```haskell
nonconsuming choice ReadPrices : [RedStoneValue]
  with
    feedIds : [RedStoneFeedId]
  controller (view this).viewers
```

The choice reads the values persisting in the adapter's `feedData` and returns a list of `RedStoneValue`s
corresponding to the passed `feedIds`.
The choice can read only aggregated values saved by using [`WritePrices`](#-writeprices).

The method doesn't modify the contract's storage.

#### ∮ ReadPriceData

```haskell
nonconsuming choice ReadPriceData : [Optional (RedStonePriceData RedStoneValue)]
  with
    feedIds : [RedStoneFeedId]
  controller (view this).viewers
```

The choice reads the values persisting in the adapter's `feedData` and returns `RedStonePriceData` records
containing the value, data timestamp, and write timestamp for each feed.
Returns `None` for feeds that have not been written yet.

The method doesn't modify the contract's storage.

#### ∮ GetUniqueSignerThreshold

```haskell
nonconsuming choice GetUniqueSignerThreshold : Int
  controller (view this).viewers
```

Returns the minimum number of unique signers required for data to be accepted.

The method doesn't modify the contract's storage.

### [RedStone PricePillFactory](../factory/src/RedStonePricePillFactory.daml)

The factory contract that creates and manages `PricePill` contracts.
It implements the [`IRedStonePricePillFactory`](../interface/src/IRedStonePricePillFactory.daml) interface.
Integrates with `FeaturedAppRight` for Canton app rewards.

#### ⨒ CreatePricePills

```haskell
nonconsuming choice CreatePricePills : [ContractId IRedStonePricePill]
  with
    viewers : [Party]
    stalenessMs : Int
    adapterId : Text
    inputData : [(RedStoneFeedId, RedStonePriceData RedStoneValue)]
  controller (view this).creators
```

Creates a new `PricePill` contract for each entry in `inputData`. Each pill is tagged with the `adapterId`
and configured with a `stalenessMs` window. Returns the list of created pill contract IDs.

The method doesn't modify the contract's storage.

#### ⨒ ArchivePricePills

```haskell
nonconsuming choice ArchivePricePills : ()
  with
    contractIds: [ContractId IRedStonePricePill]
  controller (view this).creators
```

Archives the specified `PricePill` contracts by exercising `ArchivePill` on each.

The method doesn't modify the contract's storage.

### [RedStone PricePill](../price_feed/src/RedStonePricePill.daml)

An individual price data contract implementing the [`IRedStonePricePill`](../interface/src/IRedStonePricePill.daml) interface.
Each pill contains a snapshot of price data for a single feed, created by the `PricePillFactory`.

#### ∮ ReadData

```haskell
nonconsuming choice ReadData : (RedStonePriceData RedStoneValue)
  controller (view this).viewers
```

Returns the full `RedStonePriceData` (value, timestamp, writeTimestamp) stored in the pill.
Asserts the pill is not stale before returning.

#### ∮ ReadPrice

```haskell
nonconsuming choice ReadPrice : RedStoneValue
  controller (view this).viewers
```

Returns only the price value stored in the pill.
Asserts the pill is not stale before returning.

#### ∮ ReadTimestamp

```haskell
nonconsuming choice ReadTimestamp : Int
  controller (view this).viewers
```

Returns the data timestamp (in milliseconds) stored in the pill.

#### ∮ ReadFeedId

```haskell
nonconsuming choice ReadFeedId : RedStoneFeedId
  controller (view this).viewers
```

Returns the feed identifier of the pill.

#### ∮ ReadDescription

```haskell
nonconsuming choice ReadDescription : Text
  controller (view this).viewers
```

Returns a human-readable description of the pill including feed ID, adapter ID, and validity period.

#### ∮ IsDataStale

```haskell
nonconsuming choice IsDataStale : Bool
  controller (view this).viewers
```

Returns `True` if the current ledger time exceeds the pill's staleness window
(`writeTimestamp + stalenessMs`). Used by `ReadData` and `ReadPrice` to guard against reading stale data.

#### ⨒ ArchivePill

```haskell
choice ArchivePill : ()
  controller (view this).creators
```

A consuming choice that archives (deletes) the pill contract. Can only be exercised by `creators`.

## 💊 PricePill lifecycle

1. **Creation**: When `WritePrices` is called on the adapter, the `PricePillFactory` creates a new `PricePill` for each feed with the latest price data, timestamp, and a staleness window (`pill_staleness_ms` = 1 day).
2. **Active period**: The pill is readable via `ReadData`, `ReadPrice`, `ReadTimestamp`. `IsDataStale` returns `false` while the current ledger time is within the staleness window. `ReadData` and `ReadPrice` assert the pill is not stale before returning data.
3. **Retention**: The newest pill is always available for at least `pill_keep_ms` (1 minute) — it will not be archived until the next `WritePrices` call after that time elapses. The adapter always keeps the 2 newest pills per feed. Older pills may accumulate if updates happen faster than once per minute, and are archived during the next `WritePrices` call once their `writeTimestamp` exceeds `pill_keep_ms`.
4. **Archival**: Stale pills are archived by the factory via `ArchivePricePills`, which exercises the consuming `ArchivePill` choice on each pill. Only `creators` (the updater party) can archive pills.

## ⚠ Possible transaction failures

- **Wrong timestamps**: If the payload data timestamp is not newer than the existing data for a feed, the value is skipped (not an error, just filtered out).
- **Signer count not achieved**: If the payload doesn't contain enough signatures from trusted signers, the processing returns an error for that feed.
- **Price Data is stale**: Reading a pill via `ReadData` or `ReadPrice` after its staleness window has expired will fail with an assertion error.
- **Contract not found**: If the adapter contract has been archived and recreated (after `WritePrices`), the old contract ID is no longer valid.

## 🙋‍Contact

Please feel free to contact us on [Discord](https://redstone.finance/discord) or email core@redstone.finance
