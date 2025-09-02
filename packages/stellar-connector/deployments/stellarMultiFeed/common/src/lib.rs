#![no_std]

use soroban_sdk::{
    contracttype,
    xdr::{ScErrorCode, ScErrorType},
    Error, U256,
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
