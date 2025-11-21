use alloc::vec::Vec;

use redstone::{soroban::SorobanCrypto, ConfigFactory, SignerAddress, TimestampMillis};
use soroban_sdk::{Address, Env};

#[cfg(not(feature = "agnostic-tests"))]
mod config_prod;
#[cfg(feature = "agnostic-tests")]
mod config_test;

#[cfg(not(feature = "agnostic-tests"))]
use config_prod as config_values;
#[cfg(feature = "agnostic-tests")]
use config_test as config_values;
use config_values::{
    SignerAddressBs, MAX_TIMESTAMP_AHEAD_MS, MAX_TIMESTAMP_DELAY_MS,
    REDSTONE_PRIMARY_PROD_ALLOWED_SIGNERS, SIGNER_COUNT, TRUSTED_UPDATERS, UPDATER_COUNT,
};

pub struct Config {
    pub signer_count_threshold: u8,
    pub signers: [SignerAddressBs; SIGNER_COUNT],
    pub trusted_updaters: [&'static str; UPDATER_COUNT],
    pub max_timestamp_delay_ms: u64,
    pub max_timestamp_ahead_ms: u64,
    pub min_interval_between_updates_ms: u64,
}

pub const DATA_STALENESS: TimestampMillis = TimestampMillis::from_millis(30 * 60 * 60 * 1000);

pub const FEED_TTL_SECS: u32 = 2 * 24 * 60 * 60;
pub const FEED_TTL_THRESHOLD: u32 = FEED_TTL_SECS / 5;
pub const FEED_TTL_EXTEND_TO: u32 = FEED_TTL_SECS * 3 / 10;

pub const STELLAR_CONFIG: Config = Config {
    signer_count_threshold: 3,
    signers: REDSTONE_PRIMARY_PROD_ALLOWED_SIGNERS,
    trusted_updaters: TRUSTED_UPDATERS,
    max_timestamp_ahead_ms: MAX_TIMESTAMP_AHEAD_MS,
    max_timestamp_delay_ms: MAX_TIMESTAMP_DELAY_MS,
    min_interval_between_updates_ms: 40_000,
};

impl<'a> ConfigFactory<&'a Env, SorobanCrypto<'a>> for Config {
    fn signer_count_threshold(&self) -> u8 {
        self.signer_count_threshold
    }

    fn redstone_signers(&self) -> Vec<SignerAddress> {
        self.signers.iter().map(|s| s.to_vec().into()).collect()
    }

    fn max_timestamp_delay_ms(&self) -> u64 {
        self.max_timestamp_delay_ms
    }

    fn max_timestamp_ahead_ms(&self) -> u64 {
        self.max_timestamp_ahead_ms
    }

    fn make_crypto(env: &'a Env) -> SorobanCrypto<'a> {
        SorobanCrypto::new(env)
    }
}

impl Config {
    pub fn trusted_updaters(&self, env: &Env) -> [Address; UPDATER_COUNT] {
        self.trusted_updaters
            .map(|trusted| Address::from_str(env, trusted))
    }
}
