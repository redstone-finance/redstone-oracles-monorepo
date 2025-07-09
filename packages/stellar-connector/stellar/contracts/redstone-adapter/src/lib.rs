#![no_std]
extern crate alloc;

mod config;
mod prices;
mod test;

use soroban_sdk::{contract, contractimpl, symbol_short, Bytes, Env, Symbol};

const VALUE: Symbol = symbol_short!("VALUE");
const TIMESTAMP: Symbol = symbol_short!("TIMESTAMP");
const TTL_TRESHOLD: u32 = 50;
const TTL_EXTEND_TO: u32 = 10_000;

#[contract]
pub struct Contract;

#[contractimpl]
impl Contract {
    pub fn get_prices(env: &Env, payload: Bytes) -> (u64, u64) {
        let result = prices::process_payload(&env, payload).unwrap();

        (
            result.timestamp.as_millis(),
            prices::redstone_value_to_price(result.values[0].0),
        )
    }

    pub fn write_prices(env: Env, payload: Bytes) -> (u64, u64) {
        let (timestamp, value) = Self::get_prices(&env, payload);

        env.storage().instance().set(&TIMESTAMP, &timestamp);
        env.storage().instance().set(&VALUE, &value);
        env.storage().instance().extend_ttl(TTL_TRESHOLD, TTL_EXTEND_TO);

        (timestamp, value)
    }

    pub fn read_prices(env: Env) -> (u64, u64) {
        let timestamp = env.storage().instance().get(&TIMESTAMP).unwrap_or(0);
        let value = env.storage().instance().get(&VALUE).unwrap_or(0);

        (timestamp, value)
    }
}
