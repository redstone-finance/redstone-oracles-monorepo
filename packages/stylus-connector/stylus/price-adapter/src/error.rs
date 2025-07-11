use alloy_primitives::B256;
use redstone::network::error::Error;
use stylus_sdk::{alloy_sol_types::sol, prelude::SolidityError};

sol! {
    error SdkError(uint16 error_code);
    error DataFeedNotFound(bytes32 feed);
    error NotEnoughResults();
}

#[derive(SolidityError)]
pub enum RedStoneError {
    SdkError(SdkError),
    DataFeedNotFound(DataFeedNotFound),
    NotEnoughResults(NotEnoughResults),
}

impl From<Error> for RedStoneError {
    fn from(redstone_error: Error) -> Self {
        RedStoneError::SdkError(SdkError {
            error_code: redstone_error.code(),
        })
    }
}

impl From<B256> for RedStoneError {
    fn from(feed: B256) -> Self {
        RedStoneError::DataFeedNotFound(DataFeedNotFound { feed })
    }
}
