#![no_std]
extern crate alloc;

use common::{
    PriceData, CONTRACT_TTL_EXTEND_TO_LEDGERS, CONTRACT_TTL_THRESHOLD_LEDGERS,
    MISSING_STORAGE_ENTRY,
};
use soroban_sdk::{
    contract, contractclient, contractimpl, contracttype,
    xdr::{ScErrorCode, ScErrorType},
    Address, Env, Error, String, U256,
};

const DECIMALS: u64 = 8;

#[contractclient(name = "AdapterContractClient")]
pub trait AdapterContract {
    fn read_price_data_for_feed(feed_id: String) -> Result<PriceData, Error>;
}

#[contracttype]
pub enum DataKey {
    FeedId,
    AdapterAddress,
}

#[contract]
pub struct PriceFeed;

#[contractimpl]
impl PriceFeed {
    pub fn init(env: &Env, feed_id: String, adapter_address: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::FeedId) {
            return Err(Error::from_type_and_code(
                ScErrorType::Storage,
                ScErrorCode::ExistingValue,
            ));
        }

        env.storage().instance().set(&DataKey::FeedId, &feed_id);
        env.storage()
            .instance()
            .set(&DataKey::AdapterAddress, &adapter_address);

        Ok(())
    }

    pub fn decimals() -> u64 {
        DECIMALS
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
        extend_instace_storage(env);

        let adapter_address: Address = env
            .storage()
            .instance()
            .get(&DataKey::AdapterAddress)
            .ok_or(MISSING_STORAGE_ENTRY)?;
        let feed_id: String = env
            .storage()
            .instance()
            .get(&DataKey::FeedId)
            .ok_or(MISSING_STORAGE_ENTRY)?;

        let client = AdapterContractClient::new(env, &adapter_address);

        Ok(client.read_price_data_for_feed(&feed_id))
    }
}

fn extend_instace_storage(env: &Env) {
    env.storage().instance().extend_ttl(
        CONTRACT_TTL_THRESHOLD_LEDGERS,
        CONTRACT_TTL_EXTEND_TO_LEDGERS,
    );
}
