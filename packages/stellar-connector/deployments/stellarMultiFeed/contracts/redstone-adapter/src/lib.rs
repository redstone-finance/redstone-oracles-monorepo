#![no_std]
extern crate alloc;

mod config;
mod event;
mod test;
mod utils;

use common::{
    ownable::Ownable, upgradable::Upgradable, PriceData, CONTRACT_TTL_EXTEND_TO_LEDGERS,
    CONTRACT_TTL_THRESHOLD_LEDGERS, MISSING_STORAGE_ENTRY,
};
use redstone::{
    contract::verification::UpdateTimestampVerifier, core::process_payload,
    network::error::Error as RedStoneError, soroban::helpers::ToBytes, FeedValue, TimestampMillis,
};
use soroban_sdk::{
    contract, contractimpl, storage::Persistent, Address, Bytes, BytesN, Env, Error, String, Vec,
    U256,
};

use self::config::{FEED_TTL_EXTEND_TO, FEED_TTL_THRESHOLD, STELLAR_CONFIG};
use crate::{event::WritePrices, utils::feed_to_string};

const MS_IN_SEC: u64 = 1_000;
const MISSING_FEED_CODE: u32 = 10;

#[contract]
pub struct RedStoneAdapter;

impl Ownable for RedStoneAdapter {}
impl Upgradable for RedStoneAdapter {}

#[contractimpl]
impl RedStoneAdapter {
    pub fn init(env: &Env, owner: Address) -> Result<(), Error> {
        Self::_set_owner(env, owner)
    }

    pub fn change_owner(env: &Env, new_owner: Address) -> Result<(), Error> {
        Self::_change_owner(env, new_owner)
    }

    pub fn upgrade(env: &Env, new_wasm_hash: BytesN<32>) -> Result<(), Error> {
        Self::_upgrade(env, new_wasm_hash)
    }

    pub fn get_prices(
        env: &Env,
        feed_ids: Vec<String>,
        payload: Bytes,
    ) -> Result<(u64, Vec<U256>), Error> {
        let (timestamp, prices) =
            get_prices_from_payload(env, &feed_ids, &payload).map_err(error_from_redstone_error)?;

        if prices.len() != feed_ids.len() {
            return Err(Error::from_contract_error(MISSING_FEED_CODE));
        }

        Ok((
            timestamp,
            Vec::from_iter(env, prices.into_iter().map(|(_, price)| price)),
        ))
    }

    pub fn write_prices(
        env: &Env,
        updater: Address,
        feed_ids: Vec<String>,
        payload: Bytes,
    ) -> Result<(u64, Vec<(String, U256)>), Error> {
        updater.require_auth();

        env.storage().instance().extend_ttl(
            CONTRACT_TTL_THRESHOLD_LEDGERS,
            CONTRACT_TTL_EXTEND_TO_LEDGERS,
        );

        let verifier =
            UpdateTimestampVerifier::verifier(&updater, &STELLAR_CONFIG.trusted_updaters(env));

        let (package_timestamp, prices) =
            get_prices_from_payload(env, &feed_ids, &payload).map_err(error_from_redstone_error)?;
        let write_timestamp = env.ledger().timestamp() * MS_IN_SEC;

        let db = env.storage().persistent();

        let mut updated_feeds = Vec::new(env);

        for (feed_id, price) in prices.iter() {
            let price_data = PriceData {
                price,
                package_timestamp,
                write_timestamp,
            };
            updated_feeds.push_back(price_data.clone());

            update_feed(&db, &verifier, &feed_id, &price_data)
                .map_err(error_from_redstone_error)?;
        }

        env.events().publish_event(&WritePrices {
            updated_feeds,
            payload,
            updater,
        });

        Ok((package_timestamp, prices))
    }

    pub fn read_prices(env: &Env, feed_ids: Vec<String>) -> Result<Vec<U256>, Error> {
        let mut prices = Vec::new(env);

        let db = env.storage().persistent();
        for feed_id in feed_ids {
            let price_data: PriceData = db.get(&feed_id).ok_or(MISSING_STORAGE_ENTRY)?;
            prices.push_back(price_data.price);
        }

        Ok(prices)
    }

    pub fn read_timestamp(env: &Env, feed_id: String) -> Result<u64, Error> {
        let price_data: PriceData = env
            .storage()
            .persistent()
            .get(&feed_id)
            .ok_or(MISSING_STORAGE_ENTRY)?;

        Ok(price_data.package_timestamp)
    }

    pub fn read_price_data_for_feed(env: &Env, feed_id: String) -> Result<PriceData, Error> {
        let price_data: PriceData = env
            .storage()
            .persistent()
            .get(&feed_id)
            .ok_or(MISSING_STORAGE_ENTRY)?;

        Ok(price_data)
    }

    pub fn read_price_data(env: &Env, feed_ids: Vec<String>) -> Result<Vec<PriceData>, Error> {
        let mut price_data = Vec::new(env);

        let db = env.storage().persistent();
        for feed_id in feed_ids {
            let feed_data = db.get(&feed_id).ok_or(MISSING_STORAGE_ENTRY)?;
            price_data.push_back(feed_data);
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
) -> Result<(u64, Vec<(String, U256)>), RedStoneError> {
    let feed_ids = feed_ids
        .into_iter()
        .map(|id| ToBytes::to_bytes(&id).into())
        .collect();
    let block_timestamp = TimestampMillis::from_millis(env.ledger().timestamp() * MS_IN_SEC);

    let mut config = STELLAR_CONFIG
        .redstone_config(env, feed_ids, block_timestamp)
        .unwrap();
    let result = process_payload(&mut config, payload.to_alloc_vec())?;

    let mut prices = Vec::new(env);

    for FeedValue { value, feed } in result.values {
        let price = U256::from_be_bytes(env, &Bytes::from_array(env, &value.0));
        let feed_string = feed_to_string(env, feed);
        prices.push_back((feed_string, price));
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
    db.extend_ttl(feed_id, FEED_TTL_THRESHOLD, FEED_TTL_EXTEND_TO);

    Ok(())
}

fn error_from_redstone_error(error: RedStoneError) -> Error {
    Error::from_contract_error(error.code().into())
}
