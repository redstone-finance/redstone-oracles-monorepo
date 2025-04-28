use anchor_lang::prelude::*;

pub type FeedIdBs = [u8; 32];
pub type ValueBs = [u8; 32];

const RESERVED_BYTE_SIZE: usize = 64;
pub const REDSTONE_DECIMALS_EXP: u8 = 8;

#[account]
pub struct PriceData {
    pub feed_id: FeedIdBs,
    pub value: ValueBs,
    pub timestamp: u64,
    pub write_timestamp: Option<u64>,
    pub write_slot_number: u64,
    pub decimals: u8,
    pub _reserved: [u8; RESERVED_BYTE_SIZE],
}

impl Default for PriceData {
    fn default() -> Self {
        Self {
            feed_id: Default::default(),
            value: Default::default(),
            timestamp: Default::default(),
            write_timestamp: Default::default(),
            write_slot_number: Default::default(),
            decimals: REDSTONE_DECIMALS_EXP,
            _reserved: [Default::default(); RESERVED_BYTE_SIZE],
        }
    }
}
