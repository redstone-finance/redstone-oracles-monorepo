use sep_40_oracle::Asset;
use soroban_sdk::{contracttype, Env, String, Vec};

#[contracttype]
pub enum StorageKey {
    BaseAsset,
    Assets,
    FeedToAsset(String),
    AssetToFeed(Asset),
}

pub trait EnvExt {
    fn get_base_asset(&self) -> Asset;
    fn set_base_asset(&self, asset: &Asset);
    fn get_assets(&self) -> Vec<Asset>;
    fn set_assets(&self, assets: &Vec<Asset>);
    fn get_feed_for_asset(&self, asset: &Asset) -> Option<String>;
    fn get_asset_for_feed(&self, feed: &String) -> Option<Asset>;
    fn has_feed(&self, feed: &String) -> bool;
    fn has_asset(&self, asset: &Asset) -> bool;
    fn set_mapping(&self, feed: &String, asset: &Asset);
    fn remove_mapping(&self, feed: &String, asset: &Asset);
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

    fn get_assets(&self) -> Vec<Asset> {
        self.storage()
            .persistent()
            .get(&StorageKey::Assets)
            .unwrap_or(Vec::new(self))
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
}
