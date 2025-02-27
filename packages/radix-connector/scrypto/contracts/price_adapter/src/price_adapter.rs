use common::{
    decimals::{ToRedStoneDecimal, ToRedStoneDecimals},
    process_payload::process_payload,
    read_price_data::{read_price_data, read_prices_data},
    redstone::{FeedId, Value as RedStoneValue},
    time::Time,
    verify::{verify_signers_config, verify_update},
};
use scrypto::prelude::*;

#[blueprint]
mod price_adapter {
    struct PriceAdapter {
        signer_count_threshold: u8,
        signers: Vec<Vec<u8>>,
        prices: HashMap<FeedId, RedStoneValue>,
        timestamp: u64,
        latest_update_timestamp: Option<u64>,
        time: Time,
    }

    impl PriceAdapter {
        pub fn instantiate(
            signer_count_threshold: u8,
            allowed_signer_addresses: Vec<Vec<u8>>,
        ) -> Global<PriceAdapter> {
            Self::make_instance(
                signer_count_threshold,
                allowed_signer_addresses,
                Time::System,
            )
        }

        pub fn instantiate_with_mock_timestamp(
            signer_count_threshold: u8,
            allowed_signer_addresses: Vec<Vec<u8>>,
            timestamp_mock: Option<u64>,
        ) -> Global<PriceAdapter> {
            Self::make_instance(
                signer_count_threshold,
                allowed_signer_addresses.clone(),
                timestamp_mock.into(),
            )
        }

        pub fn get_unique_signer_threshold(&self) -> u8 {
            self.signer_count_threshold
        }

        pub fn get_prices_raw(
            &self,
            feed_ids: Vec<Vec<u8>>,
            payload: Vec<u8>,
        ) -> (u64, Vec<RedStoneValue>) {
            self.process_payload(feed_ids, payload)
        }

        pub fn get_prices(&self, feed_ids: Vec<Vec<u8>>, payload: Vec<u8>) -> (u64, Vec<Decimal>) {
            let (timestamp, values) = self.get_prices_raw(feed_ids, payload);

            (
                timestamp,
                values
                    .into_iter()
                    .enumerate()
                    .to_redstone_decimals()
                    .expect("Price should be in conversion range"),
            )
        }

        pub fn write_prices_raw(
            &mut self,
            feed_ids: Vec<Vec<u8>>,
            payload: Vec<u8>,
        ) -> (u64, Vec<RedStoneValue>) {
            self.process_payload_and_write(feed_ids, payload)
        }

        pub fn write_prices(
            &mut self,
            feed_ids: Vec<Vec<u8>>,
            payload: Vec<u8>,
        ) -> (u64, Vec<Decimal>) {
            let (timestamp, values) = self.write_prices_raw(feed_ids, payload);

            (
                timestamp,
                values
                    .into_iter()
                    .enumerate()
                    .to_redstone_decimals()
                    .expect("Price should be in conversion range"),
            )
        }

        pub fn read_prices_raw(&self, feed_ids: Vec<Vec<u8>>) -> Vec<RedStoneValue> {
            let feeds = feed_ids.into_iter().map(|x| x.into()).collect::<Vec<_>>();
            read_prices_data(&self.prices, &feeds).expect("Should be able to read data")
        }

        pub fn read_prices(&self, feed_ids: Vec<Vec<u8>>) -> Vec<Decimal> {
            self.read_prices_raw(feed_ids)
                .into_iter()
                .enumerate()
                .to_redstone_decimals()
                .expect("Price should be in conversion range")
        }

        pub fn read_price_and_timestamp_raw(&self, feed_id: Vec<u8>) -> (RedStoneValue, u64) {
            (
                *read_price_data(&self.prices, &feed_id.into(), 0)
                    .expect("Should be able to read data"),
                self.timestamp,
            )
        }

        pub fn read_price_and_timestamp(&self, feed_id: Vec<u8>) -> (Decimal, u64) {
            let data = self.read_price_and_timestamp_raw(feed_id);

            (data.0.to_redstone_decimal().unwrap(), data.1)
        }

        pub fn read_timestamp(&self) -> u64 {
            self.timestamp
        }

        pub fn read_latest_update_timestamp(&self) -> Option<u64> {
            self.latest_update_timestamp
        }

        fn process_payload(
            &self,
            feed_ids: Vec<Vec<u8>>,
            payload: Vec<u8>,
        ) -> (u64, Vec<RedStoneValue>) {
            process_payload(
                self.time.get_current_in_ms(),
                self.signer_count_threshold,
                self.signers.clone(),
                feed_ids,
                payload,
            )
        }

        fn process_payload_and_write(
            &mut self,
            feed_ids: Vec<Vec<u8>>,
            payload: Vec<u8>,
        ) -> (u64, Vec<RedStoneValue>) {
            let (timestamp, values) = self.process_payload(feed_ids.clone(), payload);
            let current_timestamp = self.time.get_current_in_ms();

            verify_update(
                current_timestamp,
                self.latest_update_timestamp,
                self.timestamp,
                timestamp,
            );

            self.latest_update_timestamp = Some(current_timestamp);
            self.timestamp = timestamp;
            self.prices.extend(
                feed_ids
                    .into_iter()
                    .zip(values.clone())
                    .map(|(key, value)| (key.into(), value)),
            );
            self.time.maybe_increase(1);

            (timestamp, values)
        }

        fn make_instance(
            signer_count_threshold: u8,
            allowed_signer_addresses: Vec<Vec<u8>>,
            time: Time,
        ) -> Global<PriceAdapter> {
            verify_signers_config(&allowed_signer_addresses, signer_count_threshold);

            Self {
                signer_count_threshold,
                signers: allowed_signer_addresses,
                prices: hashmap!(),
                timestamp: 0,
                latest_update_timestamp: None,
                time,
            }
            .instantiate()
            .prepare_to_globalize(OwnerRole::None)
            .globalize()
        }
    }
}
