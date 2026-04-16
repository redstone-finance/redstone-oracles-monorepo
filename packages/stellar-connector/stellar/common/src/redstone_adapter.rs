use soroban_sdk::{contractclient, Env, Error, String, Vec};

use crate::PriceData;

#[contractclient(name = "RedStoneAdapterClient")]
pub trait RedStoneAdapter {
    fn read_price_data_for_feed(feed_id: String) -> Result<PriceData, Error>;
    fn read_price_history(feed_id: String, limit: u32) -> Result<Vec<PriceData>, Error>;
}

pub trait RedStoneAdapterTrait {
    fn read_price_data_for_feed(env: &Env, feed_id: String) -> Result<PriceData, Error>;
    fn read_price_history(env: &Env, feed_id: String, limit: u32) -> Result<Vec<PriceData>, Error>;
}
