#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use alloc::vec::Vec;

use crate::{
    config::STYLUS_CONFIG,
    error::{NotEnoughResults, RedStoneError},
};
use alloy_primitives::{B256, U256};
use redstone::{contract::verification::UpdateTimestampVerifier, TimestampMillis, Value};
use redstone_stylus::processor::Processor;
use stylus_sdk::{
    abi::Bytes,
    prelude::*,
    storage::{StorageGuard, StorageMap},
};

mod config;
mod error;

sol_storage! {
    pub struct PriceData {
      uint value;
      uint package_timestamp;
      uint write_timestamp;
    }
}

#[entrypoint]
#[storage]
struct PriceAdapter {
    prices: StorageMap<B256, PriceData>,
}

#[public]
impl PriceAdapter {
    pub fn get_prices(
        &mut self,
        feeds: Vec<B256>,
        payload: Bytes,
    ) -> Result<Vec<U256>, RedStoneError> {
        let block_timestamp = self.vm().block_timestamp();
        let block_timestamp_millis = block_timestamp * 1000;

        let processed_payload = Processor::process_payload(
            self,
            STYLUS_CONFIG,
            &feeds,
            payload,
            block_timestamp_millis,
        )?;
        if processed_payload.values.len() != feeds.len() {
            return Err(RedStoneError::NotEnoughResults(NotEnoughResults {}));
        }

        Ok(processed_payload
            .values
            .into_iter()
            .map(|v| v.to_u256())
            .collect())
    }

    pub fn write_prices(&mut self, feeds: Vec<B256>, payload: Bytes) -> Result<(), RedStoneError> {
        let block_timestamp = self.vm().block_timestamp();
        let block_timestamp_millis = block_timestamp * 1000;

        let processed_payload = Processor::process_payload(
            self,
            STYLUS_CONFIG,
            &feeds,
            payload,
            block_timestamp_millis,
        )?;

        if processed_payload.values.len() != feeds.len() {
            return Err(RedStoneError::NotEnoughResults(NotEnoughResults {}));
        }

        let verifier = UpdateTimestampVerifier::verifier(
            &self.vm().msg_sender().into_array(),
            STYLUS_CONFIG.trusted_updaters(),
        );

        for (new_price, feed) in processed_payload.values.into_iter().zip(feeds) {
            self.write_new_price(
                feed,
                new_price,
                processed_payload.timestamp,
                block_timestamp,
                &verifier,
            )?;
        }

        Ok(())
    }

    pub fn read_price(&self, feed: B256) -> U256 {
        let feed_price = self.prices.get(feed);

        feed_price.value.get()
    }

    pub fn get_unique_signers_threshold(&self) -> u8 {
        STYLUS_CONFIG.signer_count_threshold
    }

    /// Gets the last update details for a specific data feed
    /// Returns (lastDataTimestamp, lastBlockTimestamp, lastValue)
    pub fn get_last_update_details(&self, feed: B256) -> Result<(U256, U256, U256), RedStoneError> {
        let data = self.get_feed_data(feed)?;

        Ok((
            data.package_timestamp.get(),
            data.write_timestamp.get(),
            data.value.get(),
        ))
    }

    /// Gets the last update details for a specific data feed (unsafe version)
    /// Returns (lastDataTimestamp, lastBlockTimestamp, lastValue)
    pub fn get_last_update_details_unsafe(&self, feed: B256) -> (U256, U256, U256) {
        let data = self.prices.get(feed);

        (
            data.package_timestamp.get(),
            data.write_timestamp.get(),
            data.value.get(),
        )
    }

    /// Gets the last update details for a specific data feed (unsafe version)
    /// Returns (lastDataTimestamp, lastBlockTimestamp, lastValue)
    pub fn get_last_update_details_unsafe_for_many(
        &self,
        feed_ids: Vec<B256>,
    ) -> Vec<(U256, U256, U256)> {
        feed_ids
            .into_iter()
            .map(|feed_id| self.get_last_update_details_unsafe(feed_id))
            .collect()
    }

    /// Gets values for multiple data feeds
    /// Returns array of values corresponding to the requested data feed IDs
    pub fn get_values_for_data_feeds(&self, feeds: Vec<B256>) -> Result<Vec<U256>, RedStoneError> {
        feeds
            .into_iter()
            .map(|feed| self.get_feed_data(feed).map(|data| data.value.get()))
            .collect()
    }

    /// Gets the value for a single data feed
    pub fn get_value_for_data_feed(&self, feed: B256) -> Result<U256, RedStoneError> {
        let data = self.get_feed_data(feed)?;

        Ok(data.value.get())
    }

    /// Gets the data timestamp from the latest update for a specific data feed
    pub fn get_data_timestamp_from_latest_update(&self, feed: B256) -> Result<U256, RedStoneError> {
        let data = self.get_feed_data(feed)?;

        Ok(data.package_timestamp.get())
    }

    /// Gets the block timestamp from the latest update for a specific data feed
    pub fn get_block_timestamp_from_latest_update(
        &self,
        feed: B256,
    ) -> Result<U256, RedStoneError> {
        let data = self.get_feed_data(feed)?;

        Ok(data.write_timestamp.get())
    }
}

impl PriceAdapter {
    fn get_feed_data(&self, feed: B256) -> Result<StorageGuard<'_, PriceData>, RedStoneError> {
        let data = self.prices.get(feed);

        if data.package_timestamp.get() == U256::ZERO
            && data.value.get() == U256::ZERO
            && data.write_timestamp.get() == U256::ZERO
        {
            return Err(feed.into());
        }

        Ok(data)
    }

    fn write_new_price(
        &mut self,
        feed: B256,
        new_price: Value,
        timestamp: TimestampMillis,
        block_timestamp_millis: u64,
        verifier: &UpdateTimestampVerifier,
    ) -> Result<(), RedStoneError> {
        let mut feed_price = self.prices.setter(feed);

        let write_timestamp = feed_price.write_timestamp.get();
        let write_time =
            (write_timestamp != U256::ZERO).then(|| write_timestamp.to::<u64>().into());
        let package_timestamp = feed_price.package_timestamp.get().to::<u64>().into();

        verifier.verify_timestamp(
            block_timestamp_millis.into(),
            write_time,
            STYLUS_CONFIG.min_interval_between_updates_ms.into(),
            package_timestamp,
            timestamp,
        )?;

        feed_price
            .package_timestamp
            .set(U256::from(timestamp.as_millis()));
        feed_price
            .write_timestamp
            .set(U256::from(block_timestamp_millis));

        feed_price.value.set(new_price.to_u256());

        Ok(())
    }
}
