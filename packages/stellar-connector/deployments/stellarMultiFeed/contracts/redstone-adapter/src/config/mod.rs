use alloc::vec::Vec;

use redstone::{
    core::config::Config as RedstoneConfig,
    network::error::Error,
    soroban::{SorobanCrypto, SorobanRedStoneConfig},
    FeedId, SignerAddress, TimestampMillis,
};
use soroban_sdk::{Address, Env};

mod config_prod;

use config_prod as config_values;
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
    min_interval_between_updates_ms: 2 * 24 * 60 * 60 * 1_000, // 2 days
};

impl Config {
    pub fn redstone_signers(&self) -> Vec<SignerAddress> {
        self.signers.iter().map(|s| s.to_vec().into()).collect()
    }

    pub fn redstone_config<'a>(
        &'a self,
        env: &'a Env,
        feed_ids: Vec<FeedId>,
        block_timestamp: TimestampMillis,
    ) -> Result<SorobanRedStoneConfig<'a>, Error> {
        let crypto = SorobanCrypto::new(env);
        let config = RedstoneConfig::try_new(
            self.signer_count_threshold,
            self.redstone_signers(),
            feed_ids,
            block_timestamp,
            Some(self.max_timestamp_delay_ms.into()),
            Some(self.max_timestamp_ahead_ms.into()),
        )?;

        Ok((config, crypto).into())
    }

    pub fn trusted_updaters(&self, env: &Env) -> [Address; UPDATER_COUNT] {
        self.trusted_updaters
            .map(|trusted| Address::from_str(env, trusted))
    }
}
