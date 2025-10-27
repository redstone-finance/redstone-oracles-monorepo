# RedStone Canton Connector

<!-- TOC -->
* [RedStone Canton Connector](#redstone-canton-connector)
  * [Intellect.eu & Keycloak](#intellecteu--keycloak)
  * [Contracts - Canton caveats](#contracts---canton-caveats)
  * [Makefile](#makefile)
  * [Components](#components)
    * [RedStone SDK](#redstone-sdk)
    * [RedStone Interface](#redstone-interface)
    * [RedStone Adapter](#redstone-adapter)
    * [RedStone PriceFeed](#redstone-pricefeed)
    * [Test](#test)
  * [The current state of development](#the-current-state-of-development)
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

1. There's impossible to use a `TypeScript` or other SDK, because of the [5.](#intellecteu--keycloak) above.
2. It provides functions for
   1. Local development
   2. Calling [intellect.eu](./intellect.mk) methods with keycloak authorization
   3. Making [operations](./ops.mk) (calling/deploying) contracts on external provider

## Components

### [RedStone SDK](./sdk)

1. Provides a set of methods for processing and verifying the hex payload
2. Implements `U256` type for larger values
   1. But also `DecimalValue` works to values up to `2^99` with the `8`-fixed-point scale (`2^126` as multiplied value from nodes)
3. Provides [`CryptoVerify`](./sdk/src/RedStone/Internal/CryptoVerify.daml)  mechanisms for `secp256k1` crypto verification
   1. It works with  DAML`3.4.0-snapshot-2025-10-06` or `3.3.0-snapshot.20250930.0`+++

### [RedStone Interface](./interface)

1. Having unchanged interfaces, it's easier to find/call the contract by the interface it implements
2. It defines the [`IRedStoneAdapter`](./interface/src/IRedStoneAdapter.daml) and [`IRedStonePriceFeed`](./interface/src/IRedStonePriceFeed.daml) interfaces
3. Also defines the [`RedStoneTypes`](./interface/src/RedStoneTypes.daml), like `RedStoneValue` or `RedStonePriceData`

### [RedStone Adapter](./adapter)

1. Provides a [template](./adapter/src/RedStoneAdapter.daml) of a contract implementing the `IRedStoneAdapter` interface
2. The contract code may change, but until the interface remains unchanged, it can be found by the interface package id.

```haskell
  nonconsuming choice GetPrices : RedStoneResult
    with
      feedIds : [RedStoneFeedId]
      currentTime : Time
      payloadHex : Text
    controller (view this).viewers

  choice WritePrices : ContractId IRedStoneAdapter
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
```

### [RedStone PriceFeed](./price_feed)

1. Provides a [template](./price_feed/src/RedStonePriceFeed.daml) of a contract implementing the `IRedStonePriceFeed` interface
2. Every method needs to have `adapterCid` passed, because the `adapterCid` still changes.
   1. Having it saved to the PriceFeed, it will change the PriceFeed address when the adapter is changed
   2. So it's easier to find the current `adapterCid` and pass it here, with a check if the custom `adapterId` suits.

```haskell
  nonconsuming choice ReadData : (RedStonePriceData RedStoneValue)
    with
      adapterCid : RedStoneAdapterCid
    controller (view this).viewers
    do 
      readData this adapterCid

  nonconsuming choice ReadPrice : RedStoneValue
    with
      adapterCid : RedStoneAdapterCid
    controller (view this).viewers
    do 
      readPrice this adapterCid
  
  nonconsuming choice ReadTimestamp : Int
    with
      adapterCid : RedStoneAdapterCid
    controller (view this).viewers
    do 
      readTimestamp this adapterCid

  nonconsuming choice GetDescription : Text
    controller (view this).viewers
    do 
      getDescription this ()
```

### [Test](./test)

1. Contains some tests as scripts as there's no a native unit-tests mechanism
2. Provides also integration tests for local/ide/ledger deploying and running.
3. Must be extended to cover more cases

## The current state of development

1. It's possible to deploy all components above to the predefined intellect.eu participant and operate with them with the predefined user
   1. The components' system client/reader has been tested on a single domain in 2 intellect.eu node-participants for daml `2.7.9` (so with most of the checks disabled).
   2. Creating a new user in the Keycloak, they can connect to the provider, is in progress (*it always uses the admin user in the participant*)
2. Contracts' visibility in the global Canton world, outside intellect.eu, is a mystery
    1. it depends on the Parties defined in other participants
3. Managing users and participants is quite aggravating
