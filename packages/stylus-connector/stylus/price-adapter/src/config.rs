use alloy_primitives::hex;
use redstone_stylus::config::{Config, SignerAddressBs, REDSTONE_PRIMARY_PROD_ALLOWED_SIGNERS};

pub const STYLUS_CONFIG: Config = Config {
    signer_count_threshold: 3,
    signers: REDSTONE_PRIMARY_PROD_ALLOWED_SIGNERS,
    trusted_updaters: TRUSTED_UPDATERS,
    max_timestamp_ahead_ms: 3 * 60 * 1_000,
    max_timestamp_delay_ms: 3 * 60 * 1_000,
    min_interval_between_updates_ms: 40_000,
};

const TRUSTED_UPDATERS: [SignerAddressBs; 1] = [hex!("0b8c05816821CF80078e198cAea7bd6a6eD4a0e7")];
