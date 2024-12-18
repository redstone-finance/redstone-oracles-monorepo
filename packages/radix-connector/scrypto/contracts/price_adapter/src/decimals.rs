use crate::{
    price_adapter_error::PriceAdapterError,
    types::{process_feed_ids, FeedIds, U256Digits},
};
use redstone::{
    network::{as_str::AsAsciiStr, assert::Unwrap, error::Error, specific::U256},
    FeedId,
};
use scrypto::math::Decimal;

const REDSTONE_DECIMALS: u64 = 10u64.pow(8);

pub trait ToRedStoneDecimal {
    fn to_redstone_decimal(&self, feed_id: FeedId) -> Decimal;
}

impl ToRedStoneDecimal for U256Digits {
    fn to_redstone_decimal(&self, feed_id: FeedId) -> Decimal {
        let value: Result<Decimal, _> = U256::from_digits(*self).try_into();

        value.unwrap_or_revert(|_| {
            Error::contract_error(PriceAdapterError::DecimalOverflow(
                *self,
                feed_id.as_ascii_str(),
            ))
        }) / REDSTONE_DECIMALS
    }
}

pub trait ToRedStoneDecimals {
    fn to_redstone_decimals(&self, feed_ids: FeedIds) -> Vec<Decimal>;
}

impl ToRedStoneDecimals for Vec<U256Digits> {
    fn to_redstone_decimals(&self, feed_ids: FeedIds) -> Vec<Decimal> {
        self.iter()
            .zip(process_feed_ids(feed_ids))
            .map(|(&value, feed_id)| value.to_redstone_decimal(feed_id))
            .collect()
    }
}