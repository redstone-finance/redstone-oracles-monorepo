use alloc::vec::Vec;

use hex_literal::hex;
use redstone::{
    core::config::Config as RedstoneConfig,
    network::error::Error,
    soroban::{SorobanCrypto, SorobanRedStoneConfig},
    FeedId, SignerAddress, TimestampMillis,
};
use soroban_sdk::{Address, Env};

pub struct Config {
    pub signer_count_threshold: u8,
    pub signers: [SignerAddressBs; 5],
    pub trusted_updaters: [&'static str; 1],
    pub max_timestamp_delay_ms: u64,
    pub max_timestamp_ahead_ms: u64,
    pub min_interval_between_updates_ms: u64,
}

pub type SignerAddressBs = [u8; 20];

pub const FEED_TTL_SECS: u32 = 2 * 24 * 60 * 60;
pub const FEED_TTL_THRESHOLD: u32 = FEED_TTL_SECS / 5;
pub const FEED_TTL_EXTEND_TO: u32 = FEED_TTL_SECS * 3 / 10;

pub const STELLAR_CONFIG: Config = Config {
    signer_count_threshold: 3,
    signers: REDSTONE_PRIMARY_PROD_ALLOWED_SIGNERS,
    trusted_updaters: TRUSTED_UPDATERS,
    max_timestamp_ahead_ms: 30 * 60 * 1_000,
    max_timestamp_delay_ms: 30 * 60 * 1_000,
    min_interval_between_updates_ms: 40_000,
};

const REDSTONE_PRIMARY_PROD_ALLOWED_SIGNERS: [SignerAddressBs; 5] = [
    hex!("8bb8f32df04c8b654987daaed53d6b6091e3b774"),
    hex!("deb22f54738d54976c4c0fe5ce6d408e40d88499"),
    hex!("51ce04be4b3e32572c4ec9135221d0691ba7d202"),
    hex!("dd682daec5a90dd295d14da4b0bec9281017b5be"),
    hex!("9c5ae89c4af6aa32ce58588dbaf90d18a855b6de"),
];

const TRUSTED_UPDATERS: [&str; 1] = ["GDJRUXF7QNI4G3YQEBKYX26HTBKDKVLFQRVVXG7RPE5WDI57LPFZH5CF"];

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

    pub fn trusted_updaters(&self, env: &Env) -> [Address; 1] {
        self.trusted_updaters
            .map(|trusted| Address::from_str(env, trusted))
    }
}
