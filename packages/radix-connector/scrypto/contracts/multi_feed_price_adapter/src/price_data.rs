use common::{
    decimals::ToRedStoneDecimal,
    redstone::{network::error::Error, Value},
};
use scrypto::{math::Decimal, prelude::*};

#[derive(ScryptoSbor, Copy, Clone, Debug)]
pub struct PriceDataRaw {
    pub price: Value,
    pub timestamp: u64,
    pub latest_update_timestamp: u64,
}

#[derive(ScryptoSbor)]
pub struct PriceData {
    pub price: Decimal,
    pub timestamp: u64,
    pub latest_update_timestamp: u64,
}

impl ToRedStoneDecimal<PriceData> for (usize, PriceDataRaw) {
    fn to_redstone_decimal(self) -> Result<PriceData, Error> {
        Ok(PriceData {
            price: (self.0, self.1.price).to_redstone_decimal()?,
            timestamp: self.1.timestamp,
            latest_update_timestamp: self.1.latest_update_timestamp,
        })
    }
}
