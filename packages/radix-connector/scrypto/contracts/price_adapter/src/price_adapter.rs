use crate::price_data::{PriceData, PriceDataRaw};
use common::{
    decimals::{ToRedStoneDecimal, ToRedStoneDecimals},
    process_payload::process_payload,
    read_price_data::{read_price_data, read_prices_data},
    redstone::{
        contract::verification::{
            UpdateTimestampVerifier::{Trusted, Untrusted},
            *,
        },
        FeedId, Value as RedStoneValue,
    },
    time,
    verify::{verify_signers_config, verify_update},
};
use scrypto::prelude::*;

const MIN_TIME_BETWEEN_UPDATES_MS: u64 = 40_000;
const MAX_TIMESTAMP_DELAY_MS: Option<u64> = None; // uses default value
const MAX_TIMESTAMP_AHEAD_MS: Option<u64> = None; // uses default value

#[derive(ScryptoSbor, NonFungibleData)]
pub struct Updater {}

#[blueprint]
mod price_adapter {
    enable_method_auth! {
        roles {
            trusted_updater_auth => updatable_by: [];
        },
        methods {
            write_prices_trusted => restrict_to: [trusted_updater_auth, OWNER];
            write_prices_raw_trusted => restrict_to: [trusted_updater_auth, OWNER];
            write_prices => PUBLIC;
            write_prices_raw => PUBLIC;
            get_prices => PUBLIC;
            get_prices_raw => PUBLIC;
            get_unique_signer_threshold => PUBLIC;
            read_price_and_timestamp => PUBLIC;
            read_price_and_timestamp_raw => PUBLIC;
            read_price_data => PUBLIC;
            read_price_data_raw => PUBLIC;
            read_prices => PUBLIC;
            read_prices_raw => PUBLIC;
            read_timestamp => PUBLIC;
            get_trusted_updater_resource => PUBLIC;
        }
    }

    struct PriceAdapter {
        signer_count_threshold: u8,
        signers: Vec<Vec<u8>>,
        prices: KeyValueStore<FeedId, PriceDataRaw>,
        trusted_updater_resource: Option<ResourceAddress>,
    }

    impl PriceAdapter {
        pub fn instantiate(
            signer_count_threshold: u8,
            allowed_signer_addresses: Vec<Vec<u8>>,
        ) -> Global<PriceAdapter> {
            Self::make_instance(signer_count_threshold, allowed_signer_addresses, None)
        }

        pub fn instantiate_with_trusted_updaters(
            signer_count_threshold: u8,
            allowed_signer_addresses: Vec<Vec<u8>>,
            trusted_updaters: Vec<String>,
        ) -> (Global<PriceAdapter>, Bucket) {
            let (updater_badge_resource, badges) = Self::make_updater_resources(&trusted_updaters);

            (
                Self::make_instance(
                    signer_count_threshold,
                    allowed_signer_addresses,
                    Some(updater_badge_resource),
                ),
                badges,
            )
        }

        pub fn get_unique_signer_threshold(&self) -> u8 {
            self.signer_count_threshold
        }

        pub fn get_trusted_updater_resource(&self) -> Option<ResourceAddress> {
            self.trusted_updater_resource
        }

        pub fn get_prices_raw(
            &self,
            feed_ids: Vec<Vec<u8>>,
            payload: Vec<u8>,
        ) -> (u64, Vec<RedStoneValue>) {
            self.process_payload(feed_ids, payload)
        }

        pub fn get_prices(&self, feed_ids: Vec<Vec<u8>>, payload: Vec<u8>) -> (u64, Vec<Decimal>) {
            let (timestamp, values) = self.get_prices_raw(feed_ids.clone(), payload);

            (timestamp, Self::convert_to_redstone_decimals(values))
        }

        pub fn write_prices_raw(
            &mut self,
            feed_ids: Vec<Vec<u8>>,
            payload: Vec<u8>,
        ) -> (u64, Vec<RedStoneValue>) {
            self.process_payload_and_write(feed_ids, payload, Untrusted)
        }

        pub fn write_prices(
            &mut self,
            feed_ids: Vec<Vec<u8>>,
            payload: Vec<u8>,
        ) -> (u64, Vec<Decimal>) {
            let (timestamp, values) = self.process_payload_and_write(feed_ids, payload, Untrusted);

            (timestamp, Self::convert_to_redstone_decimals(values))
        }

        pub fn write_prices_raw_trusted(
            &mut self,
            feed_ids: Vec<Vec<u8>>,
            payload: Vec<u8>,
        ) -> (u64, Vec<RedStoneValue>) {
            self.process_payload_and_write(feed_ids, payload, Trusted)
        }

        pub fn write_prices_trusted(
            &mut self,
            feed_ids: Vec<Vec<u8>>,
            payload: Vec<u8>,
        ) -> (u64, Vec<Decimal>) {
            let (timestamp, values) = self.process_payload_and_write(feed_ids, payload, Trusted);

            (timestamp, Self::convert_to_redstone_decimals(values))
        }

        pub fn read_prices_raw(&self, feed_ids: Vec<Vec<u8>>) -> Vec<RedStoneValue> {
            self.read_price_data_raw(feed_ids)
                .iter()
                .map(|&d| d.price)
                .collect()
        }

        pub fn read_prices(&self, feed_ids: Vec<Vec<u8>>) -> Vec<Decimal> {
            Self::convert_to_redstone_decimals(self.read_prices_raw(feed_ids))
        }

        pub fn read_price_data_raw(&self, feed_ids: Vec<Vec<u8>>) -> Vec<PriceDataRaw> {
            let feeds = feed_ids.into_iter().map(|x| x.into()).collect::<Vec<_>>();
            read_prices_data(&self.prices, &feeds).expect("Should be able to read data")
        }

        pub fn read_price_data(&self, feed_ids: Vec<Vec<u8>>) -> Vec<PriceData> {
            Self::convert_to_redstone_decimals(self.read_price_data_raw(feed_ids))
        }

        pub fn read_price_and_timestamp_raw(&self, feed_id: Vec<u8>) -> (RedStoneValue, u64) {
            let data = read_price_data(&self.prices, &feed_id.into(), 0)
                .expect("Should be able to read data");

            (data.price, data.timestamp)
        }

        pub fn read_price_and_timestamp(&self, feed_id: Vec<u8>) -> (Decimal, u64) {
            let data = self.read_price_and_timestamp_raw(feed_id.clone());

            (
                data.0
                    .to_redstone_decimal()
                    .expect("Price should be in conversion range"),
                data.1,
            )
        }

        pub fn read_timestamp(&self, feed_id: Vec<u8>) -> u64 {
            self.read_price_and_timestamp(feed_id).1
        }

        fn process_payload(
            &self,
            feed_ids: Vec<Vec<u8>>,
            payload: Vec<u8>,
        ) -> (u64, Vec<RedStoneValue>) {
            process_payload(
                time::get_current_time_in_ms(),
                self.signer_count_threshold,
                self.signers.clone(),
                feed_ids,
                payload,
                MAX_TIMESTAMP_DELAY_MS,
                MAX_TIMESTAMP_AHEAD_MS,
            )
        }

        fn process_payload_and_write(
            &mut self,
            feed_ids: Vec<Vec<u8>>,
            payload: Vec<u8>,
            verifier: UpdateTimestampVerifier,
        ) -> (u64, Vec<RedStoneValue>) {
            let (timestamp, values) = self.process_payload(feed_ids.clone(), payload);
            let current_timestamp = time::get_current_time_in_ms();

            feed_ids
                .into_iter()
                .map(|v| v.into())
                .zip(values.clone())
                .for_each(|(feed_id, value)| {
                    let old_price_data = self.prices.get(&feed_id);

                    if let Some(price_data) = old_price_data {
                        verify_update(
                            current_timestamp,
                            Some(price_data.latest_update_timestamp),
                            MIN_TIME_BETWEEN_UPDATES_MS,
                            price_data.timestamp,
                            timestamp,
                            &verifier,
                        );
                    }

                    _ = &self.prices.insert(
                        feed_id,
                        PriceDataRaw {
                            price: value,
                            timestamp,
                            latest_update_timestamp: current_timestamp,
                        },
                    );
                });

            (timestamp, values)
        }

        fn make_instance(
            signer_count_threshold: u8,
            allowed_signer_addresses: Vec<Vec<u8>>,
            trusted_updater_resource: Option<ResourceAddress>,
        ) -> Global<PriceAdapter> {
            verify_signers_config(&allowed_signer_addresses, signer_count_threshold);

            let price_adapter = Self {
                signer_count_threshold,
                signers: allowed_signer_addresses,
                prices: KeyValueStore::new(),
                trusted_updater_resource,
            }
            .instantiate()
            .prepare_to_globalize(OwnerRole::None);

            match trusted_updater_resource {
                Some(res) => price_adapter.roles(roles!(
                    trusted_updater_auth => rule!(require(res));
                )),
                _ => price_adapter,
            }
            .globalize()
        }

        fn make_updater_resources(trusted_updaters: &[String]) -> (ResourceAddress, Bucket) {
            let badges_bucket =
                ResourceBuilder::new_string_non_fungible(OwnerRole::None)
                    .metadata(metadata!(init { "name" => "Trusted Updater Badge", locked; }))
                    .mint_initial_supply(trusted_updaters.iter().map(|address| {
                        (StringNonFungibleLocalId::new(address).unwrap(), Updater {})
                    }));

            (badges_bucket.resource_address(), badges_bucket.into())
        }

        fn convert_to_redstone_decimals<T: ToRedStoneDecimal<D>, D>(values: Vec<T>) -> Vec<D> {
            values
                .into_iter()
                .to_redstone_decimals()
                .expect("Price should be in conversion range")
        }
    }
}
