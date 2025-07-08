use alloc::vec::Vec;
use redstone::{
    core::config::Config as RedstoneConfig,
    network::error::Error,
    soroban::{SorobanCrypto, SorobanRedStoneConfig},
    FeedId, SignerAddress, TimestampMillis,
};
use soroban_sdk::Env;

pub const STELLAR_CONFIG: Config = Config {
    signer_count_threshold: 1,
    signers: REDSTONE_PRIMARY_PROD_ALLOWED_SIGNERS,
    // trusted_updaters: TRUSTED_UPDATERS,
    max_timestamp_ahead_ms: 30 * 60 * 1_000,
    max_timestamp_delay_ms: 30 * 60 * 1_000,
    // min_interval_between_updates_ms: 40_000,
};

const REDSTONE_PRIMARY_PROD_ALLOWED_SIGNERS: [SignerAddressBs; 5] = [
    [
        0x8b, 0xb8, 0xf3, 0x2d, 0xf0, 0x4c, 0x8b, 0x65, 0x49, 0x87, 0xda, 0xae, 0xd5, 0x3d, 0x6b,
        0x60, 0x91, 0xe3, 0xb7, 0x74,
    ],
    [
        0xde, 0xb2, 0x2f, 0x54, 0x73, 0x8d, 0x54, 0x97, 0x6c, 0x4c, 0x0f, 0xe5, 0xce, 0x6d, 0x40,
        0x8e, 0x40, 0xd8, 0x84, 0x99,
    ],
    [
        0x51, 0xce, 0x04, 0xbe, 0x4b, 0x3e, 0x32, 0x57, 0x2c, 0x4e, 0xc9, 0x13, 0x52, 0x21, 0xd0,
        0x69, 0x1b, 0xa7, 0xd2, 0x02,
    ],
    [
        0xdd, 0x68, 0x2d, 0xae, 0xc5, 0xa9, 0x0d, 0xd2, 0x95, 0xd1, 0x4d, 0xa4, 0xb0, 0xbe, 0xc9,
        0x28, 0x10, 0x17, 0xb5, 0xbe,
    ],
    [
        0x9c, 0x5a, 0xe8, 0x9c, 0x4a, 0xf6, 0xaa, 0x32, 0xce, 0x58, 0x58, 0x8d, 0xba, 0xf9, 0x0d,
        0x18, 0xa8, 0x55, 0xb6, 0xde,
    ],
];

// const TRUSTED_UPDATERS: [[u8; 32]; 0] = [];

pub type SignerAddressBs = [u8; 20];

pub struct Config {
    pub signer_count_threshold: u8,
    pub signers: [SignerAddressBs; 5],
    // pub trusted_updaters: [[u8; 32]; 0],
    pub max_timestamp_delay_ms: u64,
    pub max_timestamp_ahead_ms: u64,
    // pub min_interval_between_updates_ms: u64,
}

impl Config {
    pub fn redstone_signers(&self) -> Vec<SignerAddress> {
        self.signers.iter().map(|s| s.to_vec().into()).collect()
    }

    pub fn redstone_config<'a>(
        &'a self,
        env: &'a Env,
        feed_id: FeedId,
        block_timestamp: TimestampMillis,
    ) -> Result<SorobanRedStoneConfig<'a>, Error> {
        let crypto = SorobanCrypto::new(env);
        let config = RedstoneConfig::try_new(
            self.signer_count_threshold,
            self.redstone_signers(),
            [feed_id].into(),
            block_timestamp,
            Some(self.max_timestamp_delay_ms.into()),
            Some(self.max_timestamp_ahead_ms.into()),
        )?;
        Ok((config, crypto).into())
    }

    // pub fn trusted_updaters(&self) -> &[[u8; 32]] {
    //     &self.trusted_updaters
    // }
}
