#![no_std]
extern crate alloc;

mod config;
mod test;

use core::str;

use redstone::{
    contract::verification::UpdateTimestampVerifier, core::process_payload,
    network::error::Error as RedStoneError, soroban::helpers::ToBytes, TimestampMillis,
};
use soroban_sdk::{
    contract, contractimpl, contracttype,
    storage::Persistent,
    xdr::{ScErrorCode, ScErrorType},
    Address, Bytes, Env, Error, String, Vec, U256,
};

use self::config::{STELLAR_CONFIG, TTL_EXTEND_TO, TTL_THRESHOLD};

const MS_IN_SEC: u64 = 1_000;
const MISSING_FEED_ENTRY: Error =
    Error::from_type_and_code(ScErrorType::Storage, ScErrorCode::MissingValue);

#[derive(Debug, Clone)]
#[contracttype]
pub struct PriceData {
    price: U256,
    package_timestamp: u64,
    write_timestamp: u64,
}

#[contract]
pub struct Contract;

#[contractimpl]
impl Contract {
    pub fn get_prices(
        env: &Env,
        feed_ids: Vec<String>,
        payload: Bytes,
    ) -> Result<(u64, Vec<U256>), Error> {
        get_prices_from_payload(env, &feed_ids, &payload)
            .map_err(|e| Error::from_contract_error(e.code().into()))
    }

    pub fn write_prices(
        env: &Env,
        updater: Address,
        feed_ids: Vec<String>,
        payload: Bytes,
    ) -> Result<(u64, Vec<U256>), Error> {
        updater.require_auth();

        let verifier =
            UpdateTimestampVerifier::verifier(&updater, &STELLAR_CONFIG.trusted_updaters(env));

        let (package_timestamp, prices) = get_prices_from_payload(env, &feed_ids, &payload)
            .map_err(|e| Error::from_contract_error(e.code().into()))?;
        let write_timestamp = env.ledger().timestamp() * MS_IN_SEC;

        let db = env.storage().persistent();
        for (feed_id, price) in feed_ids.into_iter().zip(prices.iter()) {
            let price_data = PriceData {
                price,
                package_timestamp,
                write_timestamp,
            };
            update_feed(&db, &verifier, &feed_id, &price_data)
                .map_err(|e| Error::from_contract_error(e.code().into()))?;
        }

        Ok((package_timestamp, prices))
    }

    pub fn read_prices(env: &Env, feed_ids: Vec<String>) -> Result<Vec<U256>, Error> {
        let mut prices = Vec::new(env);

        let db = env.storage().persistent();
        for feed_id in feed_ids {
            let price_data: PriceData = db.get(&feed_id).ok_or(MISSING_FEED_ENTRY)?;
            prices.push_back(price_data.price);
        }

        Ok(prices)
    }

    pub fn read_timestamp(env: &Env, feed_id: String) -> Result<u64, Error> {
        let price_data: PriceData = env
            .storage()
            .persistent()
            .get(&feed_id)
            .ok_or(MISSING_FEED_ENTRY)?;
        Ok(price_data.package_timestamp)
    }

    pub fn read_price_data(env: &Env, feed_ids: Vec<String>) -> Result<Vec<PriceData>, Error> {
        let mut price_data = Vec::new(env);

        let db = env.storage().persistent();
        for feed_id in feed_ids {
            price_data.push_back(db.get(&feed_id).ok_or(MISSING_FEED_ENTRY)?);
        }

        Ok(price_data)
    }

    pub fn unique_signer_threshold(_: &Env) -> u64 {
        STELLAR_CONFIG.signer_count_threshold as u64
    }
}

fn get_prices_from_payload(
    env: &Env,
    feed_ids: &Vec<String>,
    payload: &Bytes,
) -> Result<(u64, Vec<U256>), RedStoneError> {
    let feed_ids = feed_ids
        .into_iter()
        .map(|id| id.to_bytes().into())
        .collect();
    let block_timestamp = TimestampMillis::from_millis(env.ledger().timestamp() * MS_IN_SEC);

    let mut config = STELLAR_CONFIG
        .redstone_config(env, feed_ids, block_timestamp)
        .unwrap();
    let result = process_payload(&mut config, payload.to_alloc_vec())?;

    let mut prices = Vec::new(env);
    for value in result.values {
        let price = U256::from_be_bytes(env, &Bytes::from_array(env, &value.0));
        prices.push_back(price);
    }

    Ok((result.timestamp.as_millis(), prices))
}

fn update_feed(
    db: &Persistent,
    verifier: &UpdateTimestampVerifier,
    feed_id: &String,
    price_data: &PriceData,
) -> Result<(), RedStoneError> {
    let old_price_data: Option<PriceData> = db.get(feed_id);

    verifier.verify_timestamp(
        price_data.write_timestamp.into(),
        old_price_data.as_ref().map(|pd| pd.write_timestamp.into()),
        STELLAR_CONFIG.min_interval_between_updates_ms.into(),
        old_price_data
            .as_ref()
            .map(|pd| pd.package_timestamp.into()),
        price_data.package_timestamp.into(),
    )?;

    db.set(feed_id, price_data);
    db.extend_ttl(feed_id, TTL_THRESHOLD, TTL_EXTEND_TO);

    Ok(())
}
