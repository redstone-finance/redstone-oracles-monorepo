use sep_40_oracle::Asset;
use soroban_sdk::{Env, Error, String, Vec};

use crate::{asset_eq, error::Sep40Error, storage::EnvExt};

pub struct FeedMap<'a> {
    env: &'a Env,
    assets: Vec<Asset>,
}

impl<'a> FeedMap<'a> {
    pub fn with(
        env: &'a Env,
        f: impl FnOnce(&mut FeedMap) -> Result<(), Error>,
    ) -> Result<(), Error> {
        let mut map = Self {
            env,
            assets: env.get_assets(),
        };

        f(&mut map)?;
        env.set_assets(&map.assets);

        Ok(())
    }

    pub fn add(&mut self, feed: &String, asset: &Asset) -> Result<(), Error> {
        if self.env.has_feed(feed) {
            return Err(Sep40Error::DuplicatedFeed.into());
        }

        self.insert(feed, asset)
    }

    pub fn remove(&mut self, feed: &String) -> Result<(), Error> {
        let asset = self
            .env
            .get_asset_for_feed(feed)
            .ok_or(Error::from_contract_error(Sep40Error::FeedNotFound as u32))?;

        self.detach(feed, &asset);

        Ok(())
    }

    fn insert(&mut self, feed: &String, asset: &Asset) -> Result<(), Error> {
        if self.env.has_asset(asset) {
            return Err(Sep40Error::DuplicatedAsset.into());
        }

        self.assets.push_back(asset.clone());
        self.env.set_mapping(feed, asset);

        Ok(())
    }

    fn detach(&mut self, feed: &String, asset: &Asset) {
        if let Some(idx) = self.assets.iter().position(|a| asset_eq(&a, asset)) {
            self.assets.remove(idx as u32);
        }

        self.env.remove_mapping(feed, asset);
    }
}
