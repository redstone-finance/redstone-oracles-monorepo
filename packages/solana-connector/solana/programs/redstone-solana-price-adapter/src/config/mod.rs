use anchor_lang::prelude::*;
use hex_literal::hex;

use redstone::{
    core::config::Config as RedstoneConfig,
    solana::{SolanaCrypto, SolanaRedStoneConfig},
    FeedId, SignerAddress, TimestampMillis,
};

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
    pub trusted_updaters: [Pubkey; UPDATER_COUNT],
    pub max_timestamp_delay_ms: u64,
    pub max_timestamp_ahead_ms: u64,
    pub min_interval_between_updates_ms: u64,
}

pub const SOLANA_CONFIG: Config = Config {
    signer_count_threshold: 3,
    signers: REDSTONE_PRIMARY_PROD_ALLOWED_SIGNERS,
    trusted_updaters: TRUSTED_UPDATERS,
    max_timestamp_ahead_ms: MAX_TIMESTAMP_AHEAD_MS,
    max_timestamp_delay_ms: MAX_TIMESTAMP_DELAY_MS,
    min_interval_between_updates_ms: 40_000,
};

impl Config {
    pub fn redstone_signers(&self) -> Vec<SignerAddress> {
        self.signers.iter().map(|s| s.to_vec().into()).collect()
    }

    pub fn redstone_config(
        &self,
        feed_id: FeedId,
        block_timestamp: TimestampMillis,
    ) -> Result<SolanaRedStoneConfig> {
        Ok((
            RedstoneConfig::try_new(
                self.signer_count_threshold,
                self.redstone_signers(),
                vec![feed_id],
                block_timestamp,
                Some(self.max_timestamp_delay_ms.into()),
                Some(self.max_timestamp_ahead_ms.into()),
            )?,
            SolanaCrypto,
        )
            .into())
    }

    pub fn trusted_updaters(&self) -> &[Pubkey] {
        &self.trusted_updaters
    }
}

#[cfg(test)]
mod tests {
    use crate::config::SOLANA_CONFIG;
    use redstone::contract::verification::verify_signers_config;

    #[test]
    fn verify_integrity_of_the_config() {
        verify_signers_config(
            &SOLANA_CONFIG.redstone_signers(),
            SOLANA_CONFIG.signer_count_threshold,
        )
        .unwrap();
    }
}
