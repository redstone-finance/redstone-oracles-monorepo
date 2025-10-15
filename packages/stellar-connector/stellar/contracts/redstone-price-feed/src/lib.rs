#![no_std]
extern crate alloc;

mod config;

use common::{
    flatten_call_result, ownable::Ownable, upgradable::Upgradable, PriceData,
    CONTRACT_TTL_EXTEND_TO_LEDGERS, CONTRACT_TTL_THRESHOLD_LEDGERS, MISSING_STORAGE_ENTRY,
};
use soroban_sdk::{
    contract, contractclient, contractimpl, contracttype,
    xdr::{ScErrorCode, ScErrorType},
    Address, Bytes, BytesN, Env, Error, String, U256,
};

use self::config::{ADAPTER_ADDRESS, DECIMALS, DESCRIPTION_PREFIX};

// IMPORTANT: Macro contractclient generates two methods for each `fn name() ->
// Result<T, Error>`. One called `name` that unwraps internally and returns T.
// And another one named `try_name` that returns `Result<Result<T,
// ConversionError>, Result<Error, InvokeError>>`. Remember to use "try" version
// if you want to handle or propagate errors.
#[contractclient(name = "RedStoneAdapterClient")]
pub trait RedStoneAdapter {
    fn read_price_data_for_feed(feed_id: String) -> Result<PriceData, Error>;
}

#[contracttype]
pub enum DataKey {
    FeedId,
}

#[contract]
pub struct RedStonePriceFeed;

impl Ownable for RedStonePriceFeed {}
impl Upgradable for RedStonePriceFeed {}

#[contractimpl]
impl RedStonePriceFeed {
    pub fn init(env: &Env, owner: Address, feed_id: String) -> Result<(), Error> {
        Self::_set_owner(env, owner)?;

        if env.storage().instance().has(&DataKey::FeedId) {
            return Err(Error::from_type_and_code(
                ScErrorType::Storage,
                ScErrorCode::ExistingValue,
            ));
        }

        env.storage().instance().set(&DataKey::FeedId, &feed_id);

        Ok(())
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

    pub fn decimals() -> u64 {
        DECIMALS
    }

    pub fn description(env: &Env) -> Result<String, Error> {
        let feed_id = Self::feed_id(env)?;

        let mut description_bytes = Bytes::new(env);

        description_bytes.extend_from_array(DESCRIPTION_PREFIX);
        description_bytes.append(&feed_id.to_bytes());

        Ok(String::from_bytes(env, &description_bytes.to_alloc_vec()))
    }

    pub fn feed_id(env: &Env) -> Result<String, Error> {
        env.storage()
            .instance()
            .get(&DataKey::FeedId)
            .ok_or(MISSING_STORAGE_ENTRY)
    }

    pub fn read_price(env: &Env) -> Result<U256, Error> {
        Ok(Self::read_price_data(env)?.price)
    }

    pub fn read_timestamp(env: &Env) -> Result<u64, Error> {
        Ok(Self::read_price_data(env)?.package_timestamp)
    }

    pub fn read_price_and_timestamp(env: &Env) -> Result<(U256, u64), Error> {
        let price_data = Self::read_price_data(env)?;

        Ok((price_data.price, price_data.package_timestamp))
    }

    pub fn read_price_data(env: &Env) -> Result<PriceData, Error> {
        extend_instance_storage(env);

        let feed_id = Self::feed_id(env)?;
        let client = get_adapter_client(env);

        flatten_call_result(client.try_read_price_data_for_feed(&feed_id))
    }
}

fn get_adapter_client(env: &Env) -> RedStoneAdapterClient {
    let adapter_address = Address::from_str(env, ADAPTER_ADDRESS);

    RedStoneAdapterClient::new(env, &adapter_address)
}

fn extend_instance_storage(env: &Env) {
    env.storage().instance().extend_ttl(
        CONTRACT_TTL_THRESHOLD_LEDGERS,
        CONTRACT_TTL_EXTEND_TO_LEDGERS,
    );
}
