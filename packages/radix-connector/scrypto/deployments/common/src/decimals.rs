use crate::price_adapter_error::PriceAdapterError;
pub use redstone::network::as_str::AsAsciiStr;
use redstone::{network::error::Error, Value};
use scrypto::math::Decimal;

const REDSTONE_DECIMALS: u64 = 10u64.pow(8);

pub trait ToRedStoneDecimal<D> {
    fn to_redstone_decimal(self) -> Result<D, Error>;
}

impl ToRedStoneDecimal<Decimal> for Value {
    fn to_redstone_decimal(self) -> Result<Decimal, Error> {
        (0, self).to_redstone_decimal()
    }
}

impl ToRedStoneDecimal<Decimal> for (usize, Value) {
    fn to_redstone_decimal(self) -> Result<Decimal, Error> {
        let value = Decimal::try_from(self.1)
            .map_err(|_| PriceAdapterError::DecimalOverflow(self.1, self.0))?;

        Ok(value / REDSTONE_DECIMALS)
    }
}

pub trait ToRedStoneDecimals<D> {
    fn to_redstone_decimals(self) -> Result<Vec<D>, Error>;
}

impl<T: ToRedStoneDecimal<D>, D, It: Iterator<Item = T>> ToRedStoneDecimals<D> for It {
    fn to_redstone_decimals(self) -> Result<Vec<D>, Error> {
        self.map(|value| value.to_redstone_decimal()).collect()
    }
}
