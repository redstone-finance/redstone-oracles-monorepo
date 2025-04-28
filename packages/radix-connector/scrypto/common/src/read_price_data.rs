use crate::price_adapter_error::PriceAdapterError;
use core::fmt::Debug;
use redstone::{network::error::Error, FeedId};
use scrypto::data::scrypto::{ScryptoDecode, ScryptoDescribe, ScryptoEncode};
use scrypto::prelude::KeyValueStore;

pub fn read_price_data<T: Clone + Debug + ScryptoEncode + ScryptoDecode + ScryptoDescribe>(
    prices: &KeyValueStore<FeedId, T>,
    feed_id: &FeedId,
    index: usize,
) -> Result<T, Error> {
    match prices.get(feed_id) {
        Some(price) => Ok(price.clone()),
        _ => Err(PriceAdapterError::MissingDataFeedValue(index, *feed_id).into()),
    }
}

pub fn read_prices_data<T: Debug + Clone + ScryptoEncode + ScryptoDecode + ScryptoDescribe>(
    prices: &KeyValueStore<FeedId, T>,
    feed_ids: &[FeedId],
) -> Result<Vec<T>, Error> {
    feed_ids
        .iter()
        .enumerate()
        .map(|(index, feed_id)| read_price_data(prices, feed_id, index))
        .collect()
}
