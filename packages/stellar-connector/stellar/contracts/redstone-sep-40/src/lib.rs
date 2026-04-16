#![no_std]
extern crate alloc;

use common::{ownable::Ownable, upgradable::Upgradable, PriceData};
use sep_40_oracle::{Asset, PriceFeedTrait};
use soroban_sdk::{contract, contractimpl, Address, Env, Error, String, Vec};
use storage::EnvExt;
use utils::price_data_to_sep_40;

use crate::{
    config::{DECIMALS, ONE_SEC},
    feed_map::FeedMap,
    utils::{asset_eq, get_adapter_client},
};

mod config;
mod error;
mod feed_map;
mod storage;
#[cfg(test)]
mod tests;
mod utils;

type Sep40PriceData = sep_40_oracle::PriceData;

#[contract]
pub struct RedStoneSep40;

impl Ownable for RedStoneSep40 {}
impl Upgradable for RedStoneSep40 {}

#[contractimpl]
impl RedStoneSep40 {
    pub fn __constructor(
        env: &Env,
        owner: Address,
        base_asset: Asset,
        feed_mappings: Vec<(String, Asset)>,
    ) -> Result<(), Error> {
        env.set_base_asset(&base_asset);

        FeedMap::with(env, |map| {
            for (feed, asset) in feed_mappings.iter() {
                map.add(&feed, &asset)?;
            }

            Ok(())
        })?;

        Self::_set_owner(env, owner)
    }

    pub fn add_feed(env: &Env, feed: String, asset: Asset) -> Result<(), Error> {
        Self::_assert_owner(env)?;

        FeedMap::with(env, |map| map.add(&feed, &asset))
    }

    pub fn remove_feed(env: &Env, feed: String) -> Result<(), Error> {
        Self::_assert_owner(env)?;

        FeedMap::with(env, |map| map.remove(&feed))
    }

    pub fn update_feed(env: &Env, feed: String, asset: Asset) -> Result<(), Error> {
        Self::_assert_owner(env)?;

        FeedMap::with(env, |map| {
            map.remove(&feed)?;
            map.add(&feed, &asset)
        })
    }

    pub fn change_owner(env: &Env, new_owner: Address) -> Result<(), Error> {
        Self::_change_owner(env, new_owner)
    }

    pub fn accept_ownership(env: &Env) -> Result<(), Error> {
        Self::_accept_ownership(env)
    }

    pub fn cancel_ownership_transfer(env: &Env) -> Result<(), Error> {
        Self::_cancel_ownership_transfer(env)
    }

    fn get_prices(env: &Env, asset: Asset, records: u32) -> Option<Vec<PriceData>> {
        let feed = env.get_feed_for_asset(&asset)?;
        let adapter = get_adapter_client(env);

        adapter.try_read_price_history(&feed, &records).ok()?.ok()
    }
}

#[contractimpl]
impl PriceFeedTrait for RedStoneSep40 {
    fn base(env: Env) -> Asset {
        env.get_base_asset()
    }

    fn assets(env: Env) -> Vec<Asset> {
        env.get_assets()
    }

    fn decimals(_: Env) -> u32 {
        DECIMALS
    }

    fn resolution(_: Env) -> u32 {
        ONE_SEC.as_secs() as u32
    }

    fn price(env: Env, asset: Asset, timestamp: u64) -> Option<Sep40PriceData> {
        let prices = Self::get_prices(&env, asset, u32::MAX)?;

        prices
            .iter()
            .find(|pd| pd.package_timestamp / ONE_SEC.as_millis() as u64 == timestamp)
            .and_then(price_data_to_sep_40)
    }

    fn prices(env: Env, asset: Asset, records: u32) -> Option<Vec<Sep40PriceData>> {
        let prices = Self::get_prices(&env, asset, records)?;

        let result = Vec::from_iter(&env, prices.iter().filter_map(price_data_to_sep_40));

        if result.is_empty() {
            return None;
        }

        Some(result)
    }

    fn lastprice(env: Env, asset: Asset) -> Option<Sep40PriceData> {
        let feed = env.get_feed_for_asset(&asset)?;
        let adapter = get_adapter_client(&env);

        adapter
            .try_read_price_data_for_feed(&feed)
            .ok()?
            .ok()
            .and_then(price_data_to_sep_40)
    }
}
