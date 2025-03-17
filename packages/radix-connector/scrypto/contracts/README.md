# Radix Blueprints — general assumptions

<!-- TOC -->
* [Radix Blueprints — general assumptions](#radix-blueprints--general-assumptions)
  * [Price Adapter](#price-adapter)
  * [Proxy](#proxy)
  * [Price Feed](#price-feed)
  * [Badge Creator](#badge-creator)
<!-- TOC -->

## Price Adapter

* The [Price Adapter](./price_adapter/README.md) component is updated from one or more off-chain processes
* The data are written to [`PriceDataRaw`](./price_adapter/src/price_data.rs) objects
* The component can be read by one of the non-mutating functions
* Logic update requires changing the code and version, but the blueprints cannot be upgraded for the current Radix
version, so will be redeployed

## Proxy

* Upgrading blueprints is not supported for the current Radix version
* Radix provides an [official example of Proxy blueprint](https://github.com/radixdlt/official-examples/blob/main/scrypto-design-patterns/blueprint-proxy/oracle-generic-proxy-with-global/src/lib.rs)
* Every [Price Feed](#price-feed) will be deployed behind proxy  
* After [Price Adapter](#price-adapter) is redeployed, the new [Price Feed](#price-feed) will be deployed
and the proxied address inside the [Price Feed](#price-feed) will be changed by the contract owner or man

## Price Feed

* The [Price Feed](./price_feed/src/price_feed.rs) component reads via [Proxy](#proxy) the data written
  to a [Price Adapter](./price_adapter/src/price_adapter.rs) component
* Every feed has its own PriceFeed
* We assume the **PriceFeed component proxy's ID won't change** and that's the **only recommended** way
  of getting data for the particular feed id.

## Badge Creator

* Creates badges to be passed to the [`Proxy`](#proxy) component instantiating, for example.
