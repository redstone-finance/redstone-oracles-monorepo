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
        self.1.to_redstone_decimal()
    }
}

impl ToRedStoneDecimal<PriceData> for PriceDataRaw {
    fn to_redstone_decimal(self) -> Result<PriceData, Error> {
        Ok(PriceData {
            price: self.price.to_redstone_decimal()?,
            timestamp: self.timestamp,
            latest_update_timestamp: self.latest_update_timestamp,
        })
    }
}
