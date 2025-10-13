#![no_std]

pub mod ownable;
pub mod upgradable;

use soroban_sdk::{
    contracttype,
    xdr::{ScErrorCode, ScErrorType},
    ConversionError, Error, InvokeError, U256,
};

#[derive(Debug, Clone)]
#[contracttype]
pub struct PriceData {
    pub price: U256,
    pub package_timestamp: u64,
    pub write_timestamp: u64,
}

const CONTRACT_TTL_SECS: u32 = 7 * 24 * 60 * 60;

pub const CONTRACT_TTL_THRESHOLD_LEDGERS: u32 = CONTRACT_TTL_SECS / 5;
pub const CONTRACT_TTL_EXTEND_TO_LEDGERS: u32 = CONTRACT_TTL_SECS * 3 / 10;

pub const MISSING_STORAGE_ENTRY: Error =
    Error::from_type_and_code(ScErrorType::Storage, ScErrorCode::MissingValue);

pub fn flatten_call_result<T>(
    result: Result<Result<T, ConversionError>, Result<Error, InvokeError>>,
) -> Result<T, Error> {
    match result {
        Ok(Ok(v)) => Ok(v),
        Ok(Err(e)) => Err(e.into()),
        Err(Ok(e)) => Err(e),
        Err(Err(InvokeError::Abort)) => Err(Error::from_type_and_code(
            ScErrorType::Contract,
            ScErrorCode::InternalError,
        )),
        Err(Err(InvokeError::Contract(code))) => Err(Error::from_contract_error(code)),
    }
}
