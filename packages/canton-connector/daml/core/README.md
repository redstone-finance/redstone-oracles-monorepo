# RedStone Pull Model in Canton

<!-- TOC -->
* [RedStone Pull Model in Canton](#redstone-pull-model-in-canton)
  * [Canton Core](#canton-core)
    * [Definitions](#definitions)
      * [Interface](#interface)
      * [Contract template](#contract-template)
    * [Example usage](#example-usage)
<!-- TOC -->

RedStone's Pull Model injects data directly into user transactions, simplifying dApp data access.
This streamlined approach handles the entire process in a single transaction, significantly reducing complexity.

The models and architecture of data are described in the [RedStone docs](https://docs.redstone.finance/docs/category/getting-started/).

## Canton Core

### Definitions

#### Interface

* The contract implements [`IRedStoneCore`](../interface/src/IRedStoneCore.daml) interface, basically by implementing
the `getPrices` function.

```haskell
interface IRedStoneCore where
  getPrices : [RedStoneFeedId] -> Time -> Text -> Update RedStoneResult

  nonconsuming choice GetPrices : RedStoneResult
    with
      feedIds : [RedStoneFeedId]
      currentTime : Time
      payloadHex : Text
    controller (view this).viewers
    do
      getPrices this feedIds currentTime payloadHex
```

#### Contract template

* By calling the nonconsuming `GetPrices` choice of the [`RedStoneCore`](./src/RedStoneCore.daml) template,
the payload data is processed as described in the [`RedStone SDK]`](../sdk/README.md) library
and the [`RedStoneResult`](../interface/src/RedStoneTypes.daml) is returned to the caller.
* The example `getPrices` implementation is quite simple and looks as below:

```haskell
  getPrices feedIds currentTime payloadHex = do
    config <- verifyConfigAgainstLedger $ redstonePrimaryProdDefaultConfig feedIds currentTime
    let (values, timestamp) = processPayloadNumeric config payloadHex

    return $ (map resultUnwrap values, timestamp)
```
where all necessary functions are defined in the [`RedStone SDK`](../sdk) library.

See more about configuring, data processing and the output in the [`RedStone SDK`](../sdk/README.md) library README file.

### Example usage

* Use the prepared [Core.daml](../test/src/Core.daml) flow by running `make run-Core`
and `make prepare_data` before, if needed.
* or use the flow similar to the one inside [Makefile](../ops.mk)
