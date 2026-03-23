# RedStone Canton Connector

<!-- TOC -->
* [RedStone Canton Connector](#redstone-canton-connector)
  * [Intellect.eu & Keycloak](#intellecteu--keycloak)
  * [Contracts - Canton caveats](#contracts---canton-caveats)
  * [Makefile](#makefile)
  * [Components](#components)
    * [RedStone SDK](#redstone-sdk)
    * [RedStone Interface](#redstone-interface)
    * [RedStone Core](#redstone-core)
    * [RedStone Adapter](#redstone-adapter)
    * [RedStone PricePillFactory](#redstone-pricepillfactory)
    * [RedStone PricePill](#redstone-pricepill)
    * [Test](#test)
<!-- TOC -->

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

### [RedStone Interface](./interface)

1. Having unchanged interfaces, it's easier to find/call the contract by the interface it implements
2. It defines the [`IRedStoneCore`](./interface/src/IRedStoneCore.daml) interface for processing the payload data on-ledger
3. It defines the [`IRedStoneAdapter`](./interface/src/IRedStoneAdapter.daml) and [`IRedStonePricePill`](./interface/src/IRedStonePricePill.daml) interfaces
4. Also defines the [`RedStoneTypes`](./interface/src/RedStoneTypes.daml), like `RedStoneValue` or `RedStonePriceData`

### [RedStone Core](./core)

1. Provides a [template](./core/src/RedStoneCore.daml) of a contract implementing the `IRedStoneCore` interface
2. The contract code may change, but until the interface remains unchanged, it can be found by the interface package id.

```haskell
  nonconsuming choice GetPrices : RedStoneResult
    with
      feedIds : [RedStoneFeedId]
      currentTime : Time
      payloadHex : Text
    controller (view this).viewers
```

See more about the Pull model and the Disclosed Core Contract [here](./core/README.md)

### [RedStone Adapter](./adapter)

1. Provides a [template](./adapter/src/RedStoneAdapter.daml) of a contract implementing the `IRedStoneAdapter` interface
2. The contract code may change, but until the interface remains unchanged, it can be found by the interface package id.

See more about the Push model, PricePill lifecycle and all choices [here](./adapter/README.md)

```haskell
  nonconsuming choice GetPrices : RedStoneResult
    with
      feedIds : [RedStoneFeedId]
      currentTime : Time
      payloadHex : Text
    controller (view this).viewers

  nonconsuming choice WritePrices : ContractId IRedStoneAdapter
    with
      feedIds : [RedStoneFeedId]
      currentTime : Time
      payloadHex : Text
    controller (view this).updaters

  nonconsuming choice ReadPrices : [RedStoneValue]
    with
      feedIds : [RedStoneFeedId]
    controller (view this).viewers

  nonconsuming choice ReadPriceData : [Optional (RedStonePriceData RedStoneValue)]
    with
      feedIds : [RedStoneFeedId]
    controller (view this).viewers

  nonconsuming choice GetUniqueSignerThreshold : Int
    controller (view this).viewers
```

The `WritePrices` choice creates a new adapter contract with updated feed data and archives the old one within the same transaction.
When a `PricePillFactory` is configured, `WritePrices` also creates `PricePill` contracts for each feed, enabling individual feed reads.

### [RedStone PricePillFactory](./factory)

1. Provides a [template](./factory/src/RedStonePricePillFactory.daml) of a contract implementing the `IRedStonePricePillFactory` interface
2. Creates `PricePill` contracts when the adapter's `WritePrices` choice is exercised
3. Manages pill lifecycle: creates new pills and archives stale ones
4. Integrates with `FeaturedAppRight` for Canton app rewards

### [RedStone PricePill](./price_feed)

![RedStonePricePill.png](adapter/RedStonePricePill.png)

1. Provides a [template](./price_feed/src/RedStonePricePill.daml) of a contract implementing the `IRedStonePricePill` interface
2. Each pill is tagged with an `adapterId` and `feedId` for filtering
3. Pills are created by the `PricePillFactory` when the adapter's `WritePrices` choice is exercised

See the detailed [PricePill lifecycle](./adapter/README.md#-pricepill-lifecycle) in the Push Oracle docs.

```haskell
  nonconsuming choice IsDataStale : Bool
    controller (view this).viewers

  nonconsuming choice ReadData : (RedStonePriceData RedStoneValue)
    controller (view this).viewers

  nonconsuming choice ReadPrice : RedStoneValue
    controller (view this).viewers

  nonconsuming choice ReadTimestamp : Int
    controller (view this).viewers

  nonconsuming choice ReadFeedId : RedStoneFeedId
    controller (view this).viewers

  nonconsuming choice ReadDescription : Text
    controller (view this).viewers

  choice ArchivePill : ()
    controller (view this).creators
```

### [Test](./test)

1. Contains some tests as scripts as there's no a native unit-tests mechanism
2. Provides also integration tests for local/ide/ledger deploying and running.
3. Must be extended to cover more cases
