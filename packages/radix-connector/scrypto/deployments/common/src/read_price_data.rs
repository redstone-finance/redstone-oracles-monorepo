use crate::price_adapter_error::PriceAdapterError;
use core::fmt::Debug;
use redstone::{network::error::Error, FeedId};
use scrypto::prelude::HashMap;

pub fn read_price_data<'a, T: Debug>(
    prices: &'a HashMap<FeedId, T>,
    feed_id: &FeedId,
    index: usize,
) -> Result<&'a T, Error> {
    match prices.get(feed_id) {
        Some(price) => Ok(price),
        _ => Err(PriceAdapterError::MissingDataFeedValue(index, *feed_id).into()),
    }
}

pub fn read_prices_data<T: Debug + Clone>(
    prices: &HashMap<FeedId, T>,
    feed_ids: &[FeedId],
) -> Result<Vec<T>, Error> {
    feed_ids
        .iter()
        .enumerate()
        .map(|(index, feed_id)| read_price_data(prices, feed_id, index).cloned())
        .collect()
}
