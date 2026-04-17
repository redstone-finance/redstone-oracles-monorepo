use common::{CONTRACT_TTL_EXTEND_TO_LEDGERS, CONTRACT_TTL_THRESHOLD_LEDGERS};
use sep_40_oracle::Asset;
use soroban_sdk::{contracttype, Env, IntoVal, String, Val, Vec};

use crate::config::DECIMALS;

#[contracttype]
pub enum StorageKey {
    BaseAsset,
    MaxDecimals,
    Assets,
    FeedToAsset(String),
    AssetToFeed(Asset),
    FeedDecimals(String),
}

pub trait EnvExt {
    fn get_base_asset(&self) -> Asset;
    fn set_base_asset(&self, asset: &Asset);
    fn get_max_decimals(&self) -> u32;
    fn set_max_decimals(&self, decimals: u32);
    fn get_assets(&self) -> Vec<Asset>;
    fn set_assets(&self, assets: &Vec<Asset>);
    fn get_feed_for_asset(&self, asset: &Asset) -> Option<String>;
    fn get_asset_for_feed(&self, feed: &String) -> Option<Asset>;
    fn get_feed_decimals(&self, feed: &String) -> u32;
    fn set_feed_decimals(&self, feed: &String, decimals: u32);
    fn remove_feed_decimals(&self, feed: &String);
    fn has_feed(&self, feed: &String) -> bool;
    fn has_asset(&self, asset: &Asset) -> bool;
    fn set_mapping(&self, feed: &String, asset: &Asset);
    fn remove_mapping(&self, feed: &String, asset: &Asset);
    fn extend_all_entries_ttl(&self);
}

impl EnvExt for Env {
    fn get_base_asset(&self) -> Asset {
        self.storage()
            .instance()
            .get(&StorageKey::BaseAsset)
            .unwrap()
    }

    fn set_base_asset(&self, asset: &Asset) {
        self.storage().instance().set(&StorageKey::BaseAsset, asset);
    }

    fn get_max_decimals(&self) -> u32 {
        self.storage()
            .instance()
            .get(&StorageKey::MaxDecimals)
            .unwrap_or(DECIMALS)
    }

    fn set_max_decimals(&self, decimals: u32) {
        self.storage()
            .instance()
            .set(&StorageKey::MaxDecimals, &decimals);
    }

    fn get_assets(&self) -> Vec<Asset> {
        self.storage()
            .persistent()
            .get(&StorageKey::Assets)
            .unwrap_or_else(|| Vec::new(self))
    }

    fn set_assets(&self, assets: &Vec<Asset>) {
        self.storage().persistent().set(&StorageKey::Assets, assets);
    }

    fn get_feed_for_asset(&self, asset: &Asset) -> Option<String> {
        self.storage()
            .persistent()
            .get(&StorageKey::AssetToFeed(asset.clone()))
    }

    fn get_asset_for_feed(&self, feed: &String) -> Option<Asset> {
        self.storage()
            .persistent()
            .get(&StorageKey::FeedToAsset(feed.clone()))
    }

    fn get_feed_decimals(&self, feed: &String) -> u32 {
        self.storage()
            .persistent()
            .get(&StorageKey::FeedDecimals(feed.clone()))
            .unwrap_or(DECIMALS)
    }

    fn set_feed_decimals(&self, feed: &String, decimals: u32) {
        self.storage()
            .persistent()
            .set(&StorageKey::FeedDecimals(feed.clone()), &decimals);
    }

    fn remove_feed_decimals(&self, feed: &String) {
        self.storage()
            .persistent()
            .remove(&StorageKey::FeedDecimals(feed.clone()));
    }

    fn has_feed(&self, feed: &String) -> bool {
        self.storage()
            .persistent()
            .has(&StorageKey::FeedToAsset(feed.clone()))
    }

    fn has_asset(&self, asset: &Asset) -> bool {
        self.storage()
            .persistent()
            .has(&StorageKey::AssetToFeed(asset.clone()))
    }

    fn set_mapping(&self, feed: &String, asset: &Asset) {
        self.storage()
            .persistent()
            .set(&StorageKey::FeedToAsset(feed.clone()), asset);
        self.storage()
            .persistent()
            .set(&StorageKey::AssetToFeed(asset.clone()), feed);
    }

    fn remove_mapping(&self, feed: &String, asset: &Asset) {
        self.storage()
            .persistent()
            .remove(&StorageKey::FeedToAsset(feed.clone()));
        self.storage()
            .persistent()
            .remove(&StorageKey::AssetToFeed(asset.clone()));
    }

    fn extend_all_entries_ttl(&self) {
        self.storage().instance().extend_ttl(
            CONTRACT_TTL_THRESHOLD_LEDGERS,
            CONTRACT_TTL_EXTEND_TO_LEDGERS,
        );

        extend_ttl_default(self, &StorageKey::Assets);

        for asset in self.get_assets().iter() {
            extend_ttl_default(self, &StorageKey::AssetToFeed(asset.clone()));

            let Some(feed) = self.get_feed_for_asset(&asset) else {
                continue;
            };

            extend_ttl_default(self, &StorageKey::FeedToAsset(feed.clone()));
            extend_ttl_default(self, &StorageKey::FeedDecimals(feed));
        }
    }
}

fn extend_ttl_default<K: IntoVal<Env, Val>>(env: &Env, key: &K) {
    env.storage().persistent().extend_ttl(
        key,
        CONTRACT_TTL_THRESHOLD_LEDGERS,
        CONTRACT_TTL_EXTEND_TO_LEDGERS,
    );
}
