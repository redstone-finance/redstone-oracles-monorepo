#![no_std]
extern crate alloc;

mod config;
mod test;

use redstone::{core::process_payload, TimestampMillis};
use soroban_sdk::{contract, contractimpl, contracttype, Bytes, Env, String, Vec, U256};

use self::config::{STELLAR_CONFIG, TTL_EXTEND_TO_2_DAYS, TTL_THRESHOLD_5_MINUTES};

const MS_IN_SEC: u64 = 1_000;

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
    pub fn get_prices(env: &Env, feed_ids: Vec<String>, payload: Bytes) -> (u64, Vec<U256>) {
        get_prices_from_payload(&env, &feed_ids, &payload)
    }

    pub fn write_prices(env: &Env, feed_ids: Vec<String>, payload: Bytes) -> (u64, Vec<U256>) {
        let (package_timestamp, prices) = get_prices_from_payload(env, &feed_ids, &payload);
        let write_timestamp = env.ledger().timestamp() * MS_IN_SEC;

        let db = env.storage().persistent();
        for (feed_id, price) in feed_ids.into_iter().zip(prices.iter()) {
            let price_data = PriceData {
                price,
                package_timestamp,
                write_timestamp,
            };
            db.set(&feed_id, &price_data);
            db.extend_ttl(&feed_id, TTL_THRESHOLD_5_MINUTES, TTL_EXTEND_TO_2_DAYS);
        }

        (package_timestamp, prices)
    }

    pub fn read_prices(env: &Env, feed_ids: Vec<String>) -> Vec<U256> {
        let mut prices = Vec::new(env);

        let db = env.storage().persistent();
        for feed_id in feed_ids {
            let price_data: PriceData = db.get(&feed_id).unwrap();
            prices.push_back(price_data.price);
        }

        prices
    }

    pub fn read_timestamp(env: &Env, feed_id: String) -> u64 {
        let price_data: PriceData = env.storage().persistent().get(&feed_id).unwrap();
        price_data.package_timestamp
    }

    pub fn read_price_data(env: &Env, feed_ids: Vec<String>) -> Vec<PriceData> {
        let mut price_data = Vec::new(env);

        let db = env.storage().persistent();
        for feed_id in feed_ids {
            price_data.push_back(db.get(&feed_id).unwrap());
        }

        price_data
    }
}

fn get_prices_from_payload(env: &Env, feed_ids: &Vec<String>, payload: &Bytes) -> (u64, Vec<U256>) {
    let feed_ids = feed_ids
        .into_iter()
        .map(|id| {
            let mut value = [0u8; 32];
            let len = id.len() as usize;
            assert!(len <= value.len());
            id.copy_into_slice(&mut value[..len]);
            value.into()
        })
        .collect();
    let block_timestamp = TimestampMillis::from_millis(env.ledger().timestamp() * MS_IN_SEC);

    let mut config = STELLAR_CONFIG
        .redstone_config(env, feed_ids, block_timestamp)
        .unwrap();
    let result = process_payload(&mut config, payload.to_alloc_vec()).unwrap();

    let mut prices = Vec::new(env);
    for value in result.values {
        let price = U256::from_be_bytes(&env, &Bytes::from_array(&env, &value.0));
        prices.push_back(price);
    }

    (result.timestamp.as_millis(), prices)
}
