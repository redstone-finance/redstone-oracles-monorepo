use common::{
    PriceData, CONTRACT_TTL_EXTEND_TO_LEDGERS, CONTRACT_TTL_THRESHOLD_LEDGERS,
    MISSING_STORAGE_ENTRY,
};
use soroban_sdk::{Env, Error, String};

use crate::{
    config::{FEED_TTL_EXTEND_TO, FEED_TTL_THRESHOLD},
    price_data_storage::PriceDataStorage,
    StorageKey,
};

pub trait EnvExt {
    fn extend_instance_ttl(&self);
    fn get_data_for_feed(&self, feed: &String) -> Result<PriceDataStorage, Error>;
    fn get_data_for_feed_or_default(&self, feed: &String) -> PriceDataStorage;
    fn get_latest_price_data_for_feed(&self, feed: &String) -> Option<PriceData>;
    fn try_get_latest_price_data_for_feed(&self, feed: &String) -> Result<PriceData, Error>;
    fn save_feed(&self, feed: &String, storage: &PriceDataStorage, latest: &PriceData);
}

impl EnvExt for Env {
    fn extend_instance_ttl(&self) {
        self.storage().instance().extend_ttl(
            CONTRACT_TTL_THRESHOLD_LEDGERS,
            CONTRACT_TTL_EXTEND_TO_LEDGERS,
        );
    }

    fn get_data_for_feed(&self, feed: &String) -> Result<PriceDataStorage, Error> {
        self.storage()
            .persistent()
            .get(&StorageKey::Feed(feed.clone()))
            .ok_or(MISSING_STORAGE_ENTRY)
    }

    fn get_data_for_feed_or_default(&self, feed: &String) -> PriceDataStorage {
        self.storage()
            .persistent()
            .get(&StorageKey::Feed(feed.clone()))
            .unwrap_or_else(|| PriceDataStorage::empty(self))
    }

    fn get_latest_price_data_for_feed(&self, feed: &String) -> Option<PriceData> {
        self.storage().persistent().get(feed)
    }

    fn try_get_latest_price_data_for_feed(&self, feed: &String) -> Result<PriceData, Error> {
        self.get_latest_price_data_for_feed(feed)
            .ok_or(MISSING_STORAGE_ENTRY)
    }

    fn save_feed(&self, feed: &String, storage: &PriceDataStorage, latest: &PriceData) {
        let db = self.storage().persistent();
        let feed_key = StorageKey::Feed(feed.clone());

        db.set(&feed_key, storage);
        db.extend_ttl(&feed_key, FEED_TTL_THRESHOLD, FEED_TTL_EXTEND_TO);

        db.set(feed, latest);
        db.extend_ttl(feed, FEED_TTL_THRESHOLD, FEED_TTL_EXTEND_TO);
    }
}
