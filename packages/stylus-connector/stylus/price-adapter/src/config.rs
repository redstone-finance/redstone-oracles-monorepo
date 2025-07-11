use alloy_primitives::hex;
use redstone::{
    core::config::Config as RedstoneConfig, network::StdEnv, FeedId, RedStoneConfigImpl,
    SignerAddress, TimestampMillis,
};

use crate::PriceAdapter;

pub type StylusRedStoneConfig<'a> = RedStoneConfigImpl<&'a mut PriceAdapter, StdEnv>;

pub const STYLUS_CONFIG: Config = Config {
    signer_count_threshold: 3,
    signers: REDSTONE_PRIMARY_PROD_ALLOWED_SIGNERS,
    trusted_updaters: TRUSTED_UPDATERS,
    max_timestamp_ahead_ms: 3 * 60 * 1_000,
    max_timestamp_delay_ms: 3 * 60 * 1_000,
    min_interval_between_updates_ms: 40_000,
};

pub type SignerAddressBs = [u8; 20];

#[derive(Debug)]
pub struct Config {
    pub signer_count_threshold: u8,
    pub signers: [SignerAddressBs; 5],
    pub trusted_updaters: [SignerAddressBs; 1],
    pub max_timestamp_delay_ms: u64,
    pub max_timestamp_ahead_ms: u64,
    pub min_interval_between_updates_ms: u64,
}

const REDSTONE_PRIMARY_PROD_ALLOWED_SIGNERS: [SignerAddressBs; 5] = [
    hex!("8bb8f32df04c8b654987daaed53d6b6091e3b774"),
    hex!("deb22f54738d54976c4c0fe5ce6d408e40d88499"),
    hex!("51ce04be4b3e32572c4ec9135221d0691ba7d202"),
    hex!("dd682daec5a90dd295d14da4b0bec9281017b5be"),
    hex!("9c5ae89c4af6aa32ce58588dbaf90d18a855b6de"),
];

const TRUSTED_UPDATERS: [SignerAddressBs; 1] = [hex!("0b8c05816821CF80078e198cAea7bd6a6eD4a0e7")];

impl Config {
    pub fn redstone_signers(&self) -> Vec<SignerAddress> {
        self.signers.iter().map(|s| s.to_vec().into()).collect()
    }

    pub fn redstone_config<'a>(
        &self,
        price_adapter: &'a mut PriceAdapter,
        feeds: Vec<FeedId>,
        block_timestamp: TimestampMillis,
    ) -> Result<StylusRedStoneConfig<'a>, redstone::network::error::Error> {
        Ok((
            RedstoneConfig::try_new(
                self.signer_count_threshold,
                self.redstone_signers(),
                feeds,
                block_timestamp,
                Some(self.max_timestamp_delay_ms.into()),
                Some(self.max_timestamp_ahead_ms.into()),
            )?,
            price_adapter,
        )
            .into())
    }
    pub fn trusted_updaters(&self) -> &[SignerAddressBs] {
        &self.trusted_updaters
    }
}
