# RedStone Canton Connector

<!-- TOC -->
* [RedStone Canton Connector](#redstone-canton-connector)
  * [Caller Pattern](#caller-pattern)
  * [Intellect.eu & Keycloak](#intellecteu--keycloak)
  * [Contracts - Canton caveats](#contracts---canton-caveats)
  * [Makefile](#makefile)
  * [Components](#components)
    * [RedStone SDK](#redstone-sdk)
    * [RedStone Types](#redstone-types)
    * [RedStone Interface](#redstone-interface)
    * [RedStone PricePill Interface](#redstone-pricepill-interface)
    * [RedStone Core](#redstone-core)
    * [RedStone Adapter](#redstone-adapter)
    * [RedStone PricePillFactory](#redstone-pricepillfactory)
    * [RedStone PricePill](#redstone-pricepill)
      * [Pill Data Fields](#pill-data-fields)
      * [Pill Lifecycle](#pill-lifecycle)
      * [Pill Duration & Staleness](#pill-duration--staleness)
      * [Pill Choices](#pill-choices)
      * [How Pills Interact with the Adapter](#how-pills-interact-with-the-adapter)
    * [Test](#test)
<!-- TOC -->

## Caller Pattern

All choices across all contracts (`IRedStoneCore`, `IRedStoneAdapter`, `IRedStonePricePill`) use a unified `caller : Party` pattern. The caller is passed as the first parameter and used as the `controller`.

- Any party can call choices directly without being in the `viewers`/`updaters` list (authorization is validated inside the choice body where needed, e.g., `WritePrices` asserts the caller is an updater)
- Simplifies disclosed contract access patterns

## Intellect.eu & Keycloak

1. That's our node-provider
2. Intellect did set up a participant (node), which we can use
3. Keycloak defines a user who can operate on the participant
4. Doesn't provide Ledger API outside the system so it can be only used via RPC calls.

## Contracts - Canton caveats

1. The whole system is defined in a functional/declarative world - which means, everything is unchangeable (const function)
2. The contracts can be instantiated, but every modification (`consuming Choice`) archives the contracts and creates a new one **with new address**
   1. The contracts can be searched off-chain by their package id and some fields provided
   2. It's possible to pass a predefined `adapterId` the contract can be found by
   3. There are also `nonconsuming` methods (`Choice`s) for reading the contract's
   4. The contracts cannot be searched on-chain
3. Every contract also needs to have the `owner`/`updaters`/`readers` defined when it's created
   1. These are `Parties` - something like user/role, no other `Party` can view/**find**/act with the contract
   2. Another user can have `canActAs` permission, which means they can operate as other `Party`
4. Ledger doesn't have access to real timestamp
    1. So it's necessary to pass off-chain `currentTimestamp` and use methods like [`isLedgerTimeLE/LT/GE/GT`](https://docs.digitalasset.com/build/3.4/reference/daml/stdlib/DA-Time.html#function-da-time-isledgertimelt-78120)
       or [`assertWithDeadline`](https://docs.digitalasset.com/build/3.4/reference/daml/stdlib/DA-Assert.html#function-da-assert-assertwithindeadline-85580`)
5. Upgrading requires the new package is a superset of the package upgraded
   1. especially all module files, types and `Choice`s in each dependent module must suit.

## [Makefile](./Makefile)

1. There's impossible to use a `TypeScript` or other SDK, because of the [4.](#intellecteu--keycloak) above.
2. It provides functions for
   1. Local development
   2. Calling [intellect.eu](./intellect.mk) methods with keycloak authorization
   3. Making [operations](./ops.mk) (calling/deploying) contracts on external provider

## Components

### [RedStone SDK](./sdk)

1. Provides a set of methods for processing and verifying the hex payload using `secp256k1` [`crypto verification`](./sdk/src/RedStone/Internal/CryptoVerify.daml)
2. Implements `U256` type for larger values
   1. But also `DecimalValue` works to values up to `2^99` with the `8`-fixed-point scale (`2^126` as multiplied value from nodes)

See more about the [RedStone SDK](./sdk/README.md) library.

### [RedStone Types](./types)

1. Defines shared type definitions used across all packages: [`RedStoneTypes`](./types/src/RedStoneTypes.daml)
2. Includes `RedStoneFeedId`, `RedStoneValue`, `RedStonePriceData`, `RedStoneResult`, `PayloadHex`, etc.

### [RedStone Interface](./interface)

1. Having unchanged interfaces, it's easier to find/call the contract by the interface it implements
2. It defines the [`IRedStoneCore`](./interface/src/IRedStoneCore.daml) interface for processing the payload data on-ledger
3. It defines the [`IRedStoneAdapter`](./interface/src/IRedStoneAdapter.daml) and [`IRedStonePricePillFactory`](./interface/src/IRedStonePricePillFactory.daml) interfaces
4. Interfaces use `verify*` methods (e.g., `iRedStoneAdapter_VerifyUpdater`, `iRedStonePricePillFactory_VerifyCreator`) for authorization instead of inline `assertMsg` with view fields

### [RedStone PricePill Interface](./price_pill)

1. Defines the [`IRedStonePricePill`](./price_pill/src/IRedStonePricePill.daml) interface for price pill read/archive choices
2. Includes `ReadData`, `ReadPrice`, `ReadTimestamp`, `ReadFeedId`, `ReadDescription`, `IsDataStale`, and `ArchivePill` choices
3. Uses `verify*` methods (`iRedStonePricePill_VerifyArchiver`) for archive authorization

### [RedStone Core](./core)

1. Provides a [template](./core/src/RedStoneCore.daml) of a contract implementing the `IRedStoneCore` interface
2. The contract code may change, but until the interface remains unchanged, it can be found by the interface package id.

```haskell
  nonconsuming choice GetPrices : RedStoneResult
    with
      caller : Party
      feedIds : [RedStoneFeedId]
      currentTime : Time
      payloadHex : Text
    controller caller
```

See more about the Pull model and the Disclosed Core Contract [here](./core/README.md)

### [RedStone Adapter](./adapter)

1. Provides a [template](./adapter/src/RedStoneAdapter.daml) of a contract implementing the `IRedStoneAdapter` interface
2. The contract code may change, but until the interface remains unchanged, it can be found by the interface package id.

See more about the Push model, PricePill lifecycle and all choices [here](./adapter/README.md)

```haskell
  nonconsuming choice GetPrices : RedStoneResult
    with
      caller : Party
      feedIds : [RedStoneFeedId]
      currentTime : Time
      payloadHex : Text
    controller caller

  nonconsuming choice WritePrices : ContractId IRedStoneAdapter
    with
      caller : Party
      feedIds : [RedStoneFeedId]
      currentTime : Time
      payloadHex : Text
      additionalPillViewers : Optional [Party]
    controller caller

  nonconsuming choice ReadPrices : [RedStoneValue]
    with
      caller : Party
      feedIds : [RedStoneFeedId]
    controller caller

  nonconsuming choice ReadPriceData : [Optional (RedStonePriceData RedStoneValue)]
    with
      caller : Party
      feedIds : [RedStoneFeedId]
    controller caller

  nonconsuming choice GetUniqueSignerThreshold : Int
    with
      caller : Party
    controller caller
```

The `WritePrices` choice creates a new adapter contract with updated feed data and archives the old one within the same transaction.
When a `PricePillFactory` is configured, `WritePrices` also creates `PricePill` contracts for each feed, enabling individual feed reads.

### [RedStone PricePillFactory](./factory)

1. Provides a [template](./factory/src/RedStonePricePillFactory.daml) of a contract implementing the `IRedStonePricePillFactory` interface
2. Creates `PricePill` contracts when the adapter's `WritePrices` choice is exercised
3. Manages pill lifecycle: creates new pills and archives stale ones
4. Integrates with `FeaturedAppRight` for Canton app rewards

### [RedStone PricePill](./price_feed)

![RedStone PricePill](adapter/RedStonePricePill.png)

A **PricePill** is an individual Daml contract representing a single price feed data point.
Each pill is created by the `RedStonePricePillFactory` when the adapter has a factory configured,
and contains a snapshot of price data for a single feed.

#### Pill Data Fields

Each `RedStonePricePill` contract contains:

| Field | Type | Description |
|-------|------|-------------|
| `value` | `Numeric 8` | The aggregated price value |
| `timestamp` | `Int` | Data timestamp (ms since epoch) |
| `writeTimestamp` | `Int` | When the pill was written to the ledger (ms) |
| `feedId` | `RedStoneFeedId` | Feed identifier (e.g., `[69, 84, 72]` for ETH) |
| `description` | `Text` | Human-readable description |
| `stalenessMs` | `Int` | Staleness window in milliseconds |
| `adapterId` | `Text` | Identifier of the adapter that created this pill |

#### Pill Lifecycle

1. **Creation**: Pills are created during `WritePrices` when the adapter has a `pillFactory` configured. The factory creates one pill per feed ID per write operation. Each pill is a separate Daml contract that can be independently queried.
2. **Active period**: The pill is readable via `ReadData`, `ReadPrice`, `ReadTimestamp`. `IsDataStale` returns `False` while the current ledger time is within the staleness window. `ReadData` and `ReadPrice` assert the pill is not stale before returning data.
3. **Retention**: The adapter keeps the **newest 2 pills per feed** — older ones are archived during the next write. The newest pill is always available for at least `pill_keep_ms` (1 minute) — it will not be archived until the next `WritePrices` call after that time elapses.
4. **Archival**: Stale pills are archived by the factory via `ArchivePricePills`, which exercises the consuming `ArchivePill` choice on each pill. Only `creators` (the updater party) can archive pills.

#### Pill Duration & Staleness

- `pill_staleness_ms` = **86,400,000 ms** (1 day) — after this time, `IsDataStale` returns `True`
- `pill_keep_ms` = **60,000 ms** (1 minute) — pills older than this are archived during the next write
- Archiving is done via `ArchivePricePills` on the factory, which exercises `ArchivePill` on each pill

#### Pill Choices

All choices take `caller : Party` as the first parameter:

```haskell
  nonconsuming choice ReadData : (RedStonePriceData RedStoneValue)
    with
      caller : Party
    controller caller

  nonconsuming choice ReadPrice : RedStoneValue
    with
      caller : Party
    controller caller

  nonconsuming choice ReadTimestamp : Int
    with
      caller : Party
    controller caller

  nonconsuming choice ReadFeedId : RedStoneFeedId
    with
      caller : Party
    controller caller

  nonconsuming choice ReadDescription : Text
    with
      caller : Party
    controller caller

  nonconsuming choice IsDataStale : Bool
    with
      caller : Party
    controller caller

  choice ArchivePill : ()
    with
      caller : Party
    controller caller
```

- **`ReadData`** — returns full `RedStonePriceData` (value, timestamp, writeTimestamp)
- **`ReadPrice`** — returns just the price value
- **`ReadTimestamp`** — returns the data timestamp
- **`ReadFeedId`** — returns the feed ID
- **`ReadDescription`** — returns human-readable description
- **`IsDataStale`** — checks if `timestamp + stalenessMs < currentLedgerTime`
- **`ArchivePill`** — consuming choice, validates caller is a creator

#### How Pills Interact with the Adapter

- When `pillFactory` is `Some factory`: `WritePrices` creates pills via factory, manages lifecycle
- When `pillFactory` is `None`: `WritePrices` emits `PriceUpdateEvent`s instead (no pills)
- The `PillCleaner` TypeScript utility archives stale pills in batches of 200

See the detailed [PricePill lifecycle](./adapter/README.md#-pricepill-lifecycle) in the Push Oracle docs.

### [Test](./test)

1. Contains some tests as scripts as there's no a native unit-tests mechanism
2. Provides also integration tests for local/ide/ledger deploying and running.
3. Must be extended to cover more cases
