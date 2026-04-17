#![no_std]
extern crate alloc;

mod config;
mod env_extensions;
mod event;
mod price_data_storage;
mod test;
mod utils;

use core::num::NonZero;

use common::{
    ownable::Ownable, redstone_adapter::RedStoneAdapterTrait, upgradable::Upgradable, PriceData,
};
use redstone::{
    contract::verification::{verify_data_staleness, UpdateTimestampVerifier},
    core::process_payload,
    network::error::Error as RedStoneError,
    soroban::{helpers::ToBytes, SorobanRedStoneConfig},
    ConfigFactory, FeedValue,
};
use soroban_sdk::{
    contract, contractimpl, contracttype, Address, Bytes, BytesN, Env, Error, String, Vec, U256,
};

use self::config::{DATA_STALENESS, STELLAR_CONFIG};
use crate::{
    env_extensions::EnvExt,
    event::WritePrices,
    utils::{feed_to_string, now},
};

const MISSING_FEED_CODE: u32 = 10;
const HISTORY_LIMIT: NonZero<u32> = NonZero::new(10).unwrap();

#[contracttype]
#[derive(Clone, Debug)]
enum StorageKey {
    Feed(String),
    HistoryLimit,
}

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

    pub fn accept_ownership(env: &Env) -> Result<(), Error> {
        Self::_accept_ownership(env)
    }

    pub fn cancel_ownership_transfer(env: &Env) -> Result<(), Error> {
        Self::_cancel_ownership_transfer(env)
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
    ) -> Result<(), Error> {
        updater.require_auth();
        env.extend_instance_ttl();

        let verifier =
            UpdateTimestampVerifier::verifier(&updater, &STELLAR_CONFIG.trusted_updaters(env));

        let (package_timestamp, prices) =
            get_prices_from_payload(env, &feed_ids, &payload).map_err(error_from_redstone_error)?;
        let write_timestamp = now(env);

        let mut updated_feeds = Vec::new(env);

        for (feed_id, price) in prices.iter() {
            let price_data = PriceData {
                price,
                package_timestamp,
                write_timestamp: write_timestamp.as_millis(),
            };

            if update_feed(env, &verifier, &feed_id, &price_data, HISTORY_LIMIT.get()) {
                updated_feeds.push_back(price_data.clone());
            }
        }

        env.events().publish_event(&WritePrices {
            updated_feeds,
            updater,
        });

        Ok(())
    }

    pub fn read_prices(env: &Env, feed_ids: Vec<String>) -> Result<Vec<U256>, Error> {
        let mut prices = Vec::new(env);

        for feed_id in feed_ids {
            let last = env.try_get_latest_price_data_for_feed(&feed_id)?;
            let checked = Self::check_price_data(env, last)?;
            prices.push_back(checked.price);
        }

        Ok(prices)
    }

    pub fn read_timestamp(env: &Env, feed_id: String) -> Result<u64, Error> {
        let last = env.try_get_latest_price_data_for_feed(&feed_id)?;
        let checked = Self::check_price_data(env, last)?;

        Ok(checked.package_timestamp)
    }

    pub fn read_price_data_for_feed(env: &Env, feed_id: String) -> Result<PriceData, Error> {
        let last = env.try_get_latest_price_data_for_feed(&feed_id)?;

        Self::check_price_data(env, last)
    }

    pub fn read_price_data(env: &Env, feed_ids: Vec<String>) -> Result<Vec<PriceData>, Error> {
        let mut price_data = Vec::new(env);

        for feed_id in feed_ids {
            let last = env.try_get_latest_price_data_for_feed(&feed_id)?;
            let checked = Self::check_price_data(env, last)?;
            price_data.push_back(checked);
        }

        Ok(price_data)
    }

    pub fn read_price_history(
        env: &Env,
        feed_id: String,
        limit: u32,
    ) -> Result<Vec<PriceData>, Error> {
        let storage = env.get_data_for_feed(&feed_id)?;
        let data = storage.get_all();

        match data.len().checked_sub(limit) {
            Some(0) | None => Ok(data),
            Some(start) => return Ok(data.slice(start..)),
        }
    }

    pub fn check_price_data(env: &Env, price_data: PriceData) -> Result<PriceData, Error> {
        verify_data_staleness(price_data.write_timestamp.into(), now(env), DATA_STALENESS)
            .map_err(error_from_redstone_error)?;

        Ok(price_data)
    }

    pub fn unique_signer_threshold(_: &Env) -> u64 {
        STELLAR_CONFIG.signer_count_threshold as u64
    }
}

impl RedStoneAdapterTrait for RedStoneAdapter {
    fn read_price_data_for_feed(env: &Env, feed_id: String) -> Result<PriceData, Error> {
        Self::read_price_data_for_feed(env, feed_id)
    }

    fn read_price_history(env: &Env, feed_id: String, limit: u32) -> Result<Vec<PriceData>, Error> {
        Self::read_price_history(env, feed_id, limit)
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
    let block_timestamp = now(env);

    let mut config: SorobanRedStoneConfig<'_> =
        STELLAR_CONFIG.redstone_config(env, feed_ids, block_timestamp)?;
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
    env: &Env,
    verifier: &UpdateTimestampVerifier,
    feed_id: &String,
    price_data: &PriceData,
    limit: u32,
) -> bool {
    let mut storage = env.get_data_for_feed_or_default(feed_id);
    let old_price_data = env.get_latest_price_data_for_feed(feed_id);

    if verifier
        .verify_timestamp(
            price_data.write_timestamp.into(),
            old_price_data.as_ref().map(|pd| pd.write_timestamp.into()),
            STELLAR_CONFIG.min_interval_between_updates_ms.into(),
            old_price_data
                .as_ref()
                .map(|pd| pd.package_timestamp.into()),
            price_data.package_timestamp.into(),
        )
        .is_err()
    {
        return false;
    }

    if storage.push(price_data.clone(), limit).is_err() {
        return false;
    }

    env.save_feed(feed_id, &storage, price_data);

    true
}

fn error_from_redstone_error(error: RedStoneError) -> Error {
    Error::from_contract_error(error.code().into())
}
