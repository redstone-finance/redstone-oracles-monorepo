use redstone::core::{process_payload as redstone_process_payload, ProcessorResult};
use soroban_sdk::{Bytes, Env};

use crate::config::STELLAR_CONFIG;

const ETH: [u8; 32] = [
    69, 84, 72, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0,
];

pub fn process_payload(env: &Env, payload: Bytes) -> ProcessorResult {
    let mut config = STELLAR_CONFIG.redstone_config(
        env,
        ETH.into(),
        (env.ledger().timestamp() * 1000).into(),
    )?;
    redstone_process_payload(&mut config, payload.to_alloc_vec())
}

pub fn redstone_value_to_price(raw_be_value: [u8; 32]) -> u64 {
    u64::from_be_bytes(raw_be_value[24..].try_into().unwrap())
}
