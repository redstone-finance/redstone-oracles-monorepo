# Radix Blueprints — general assumptions

<!-- TOC -->
* [Radix Blueprints — general assumptions](#radix-blueprints--general-assumptions)
  * [Important disclaimer](#important-disclaimer)
  * [Price Adapter](#price-adapter)
  * [Proxy](#proxy)
  * [Price Feed](#price-feed)
<!-- TOC -->

## Important disclaimer

We assume the PriceFeed component proxy's ID won't change and
that's **the only recommended way of getting data** for the particular feed id.

For example, to read the `XYZ` price value use:

```rust
call_method(proxy_address, "read_price_and_timestamp", XYZ_vec_data)
```

or
```rust
call_method(proxy_address, "get_description")
```

for getting description.

Available methods correspond to the [PriceFeed](#price-feed) contract.

⚠️⚠️ The other calling way, especially with reading the state, is forbidden and may lead to **unexpected results**,
due to changed adapter's logic (component re-instantiated) or the proxied object address. ⚠️⚠️

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

