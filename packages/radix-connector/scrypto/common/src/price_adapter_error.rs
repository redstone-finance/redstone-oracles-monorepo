use redstone::{
    network::{
        as_str::AsAsciiStr,
        error::{ContractErrorContent, Error},
    },
    FeedId, Value,
};

/// Represents errors specific to the price adapter's functionality.
///
/// This enum encapsulates various errors that can occur within the price adapter component
/// of a contract or application.
/// These errors relate to configuration and runtime checks necessary for the correct operation of the price adapter.
///
/// It implements the `ContractErrorContent` trait, allowing these errors to be used directly
/// as part of the RedStone payload processing mechanism.
#[derive(Debug)]
pub enum PriceAdapterError {
    /// Represents a missing value for a specified data feed.
    ///
    /// This error occurs when an expected value for a data feed is not found.
    /// It contains the index (`usize`) identifying the data feed in question and a `String`
    /// message providing additional context or the name of the missing data feed.
    MissingDataFeedValue(usize, FeedId),

    /// This error occurs when the value for a data feed is exceeding the Radix Decimal range.
    /// It contains the value (Value) representing the raw-value and an index of the overflowing data feed.
    DecimalOverflow(Value, usize),
}

impl PriceAdapterError {
    #[inline]
    fn code(&self) -> u8 {
        match self {
            PriceAdapterError::MissingDataFeedValue(index, _) => 100 + *index as u8,
            PriceAdapterError::DecimalOverflow(_, _) => 192,
        }
    }

    #[inline]
    fn message(&self) -> String {
        match self {
            PriceAdapterError::MissingDataFeedValue(index, feed_id) => {
                format!(
                    "Missing data feed value for #{} ({})",
                    index,
                    feed_id.as_ascii_str()
                )
            }

            PriceAdapterError::DecimalOverflow(value, idx) => {
                format!("Decimal overflow: {} at #({})", value.to_u256(), idx,)
            }
        }
    }
}

impl From<PriceAdapterError> for Error {
    fn from(value: PriceAdapterError) -> Self {
        Error::ContractError(ContractErrorContent {
            code: value.code(),
            msg: value.message(),
        })
    }
}
