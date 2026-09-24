// === Imports ===

module price_feed_example::example;

use redstone_price_adapter::price_adapter::PriceAdapter;

// === Public-View Functions ===

/// Returns latest BTC (price, timestamp) tuple read through price_feed_btc
public fun btc_price_and_timestamp(price_adapter: &PriceAdapter): (u256, u64) {
    price_feed_btc::price_feed_btc::price_and_timestamp(price_adapter)
}

/// Returns latest SUI (price, timestamp) tuple read through price_feed_sui
public fun sui_price_and_timestamp(price_adapter: &PriceAdapter): (u256, u64) {
    price_feed_sui::price_feed_sui::price_and_timestamp(price_adapter)
}

/// Returns latest USDC (price, timestamp) tuple read through price_feed_usdc
public fun usdc_price_and_timestamp(price_adapter: &PriceAdapter): (u256, u64) {
    price_feed_usdc::price_feed_usdc::price_and_timestamp(price_adapter)
}
