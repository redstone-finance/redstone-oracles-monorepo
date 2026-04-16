use common::PriceData;
use sep_40_oracle::Asset;
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, testutils::Address as _, Address, Env,
    Error, String, Vec, U256,
};

use crate::{
    asset_eq,
    config::{ADAPTER_ADDRESS, DECIMALS, ONE_SEC},
    error::Sep40Error,
    RedStoneSep40, RedStoneSep40Client,
};

const MOCK_ERROR_CODE: u32 = 999;

const PRICE_A: u32 = 1900;
const PRICE_B: u32 = 2000;
const PRICE_C: u32 = 2100;

const PKG_TS_A: u64 = 1_700_000_000_000;
const PKG_TS_B: u64 = 1_700_001_000_000;
const PKG_TS_C: u64 = 1_700_002_000_000;

const WRITE_TS_A: u64 = 1_700_000_001_000;
const WRITE_TS_B: u64 = 1_700_001_001_000;
const WRITE_TS_C: u64 = 1_700_002_001_000;

const SEP40_TS_A: u64 = 1_700_000_000;
const SEP40_TS_B: u64 = 1_700_001_000;

const NON_MATCHING_TS: u64 = 9_999_999_999;

const HISTORY_LIMIT: u32 = 2;
const PRICES_QUERY_LIMIT: u32 = 5;

#[contract]
pub struct MockAdapter;

#[contracttype]
enum MockKey {
    Price(String),
    History(String),
}

#[contractimpl]
impl MockAdapter {
    pub fn set_price(env: &Env, feed_id: String, price_data: PriceData) {
        env.storage()
            .persistent()
            .set(&MockKey::Price(feed_id), &price_data);
    }

    pub fn set_history(env: &Env, feed_id: String, prices: Vec<PriceData>) {
        env.storage()
            .persistent()
            .set(&MockKey::History(feed_id), &prices);
    }

    pub fn read_price_data_for_feed(env: &Env, feed_id: String) -> Result<PriceData, Error> {
        env.storage()
            .persistent()
            .get(&MockKey::Price(feed_id))
            .ok_or(Error::from_contract_error(MOCK_ERROR_CODE))
    }

    pub fn read_price_history(
        env: &Env,
        feed_id: String,
        limit: u32,
    ) -> Result<Vec<PriceData>, Error> {
        let prices: Vec<PriceData> = env
            .storage()
            .persistent()
            .get(&MockKey::History(feed_id))
            .ok_or(Error::from_contract_error(MOCK_ERROR_CODE))?;

        let len = prices.len();
        let start = len.saturating_sub(limit);

        Ok(prices.slice(start..len))
    }
}

fn set_up() -> (RedStoneSep40Client<'static>, Address, Address, Env) {
    let env = Env::default();
    let owner = Address::generate(&env);
    let adapter_id = env.register_at(&Address::from_str(&env, ADAPTER_ADDRESS), MockAdapter, ());

    let base_asset = Asset::Other(symbol_short!("USD"));
    let feed = String::from_str(&env, "ETH");
    let asset = Asset::Other(symbol_short!("ETH"));

    let mut mappings = Vec::new(&env);
    mappings.push_back((feed, asset));

    let contract_id = env.register(RedStoneSep40, (owner.clone(), base_asset, mappings));

    let client = RedStoneSep40Client::new(&env, &contract_id);

    (client, owner, adapter_id, env)
}

fn make_price_data(env: &Env, price: u32, package_ts: u64, write_ts: u64) -> PriceData {
    PriceData {
        price: U256::from_u32(env, price),
        package_timestamp: package_ts,
        write_timestamp: write_ts,
    }
}

fn assert_asset_eq(a: &Asset, b: &Asset) {
    assert!(asset_eq(a, b), "assets not equal");
}

#[test]
fn constructor_sets_base_asset() {
    let (client, ..) = set_up();

    assert_asset_eq(&client.base(), &Asset::Other(symbol_short!("USD")));
}

#[test]
fn constructor_sets_assets() {
    let (client, ..) = set_up();

    let assets = client.assets();
    assert_eq!(assets.len(), 1);
    assert_asset_eq(&assets.get(0).unwrap(), &Asset::Other(symbol_short!("ETH")));
}

#[test]
#[should_panic]
fn constructor_duplicate_feed_fails() {
    let env = Env::default();
    let owner = Address::generate(&env);
    env.register_at(&Address::from_str(&env, ADAPTER_ADDRESS), MockAdapter, ());

    let feed = String::from_str(&env, "ETH");
    let asset_a = Asset::Other(symbol_short!("ETH"));
    let asset_b = Asset::Other(symbol_short!("ETHA"));

    let mut mappings = Vec::new(&env);
    mappings.push_back((feed.clone(), asset_a));
    mappings.push_back((feed, asset_b));

    env.register(
        RedStoneSep40,
        (owner, Asset::Other(symbol_short!("USD")), mappings),
    );
}

#[test]
#[should_panic]
fn constructor_duplicate_asset_fails() {
    let env = Env::default();
    let owner = Address::generate(&env);
    env.register_at(&Address::from_str(&env, ADAPTER_ADDRESS), MockAdapter, ());

    let asset = Asset::Other(symbol_short!("ETH"));

    let mut mappings = Vec::new(&env);
    mappings.push_back((String::from_str(&env, "ETH"), asset.clone()));
    mappings.push_back((String::from_str(&env, "ETH2"), asset));

    env.register(
        RedStoneSep40,
        (owner, Asset::Other(symbol_short!("USD")), mappings),
    );
}

#[test]
fn decimals_returns_configured_value() {
    let (client, ..) = set_up();

    assert_eq!(client.decimals(), DECIMALS);
}

#[test]
fn resolution_is_one_second() {
    let (client, ..) = set_up();

    assert_eq!(client.resolution(), ONE_SEC.as_secs() as u32);
}

#[test]
fn add_feed_adds_new_feed() {
    let (client, _, _, env) = set_up();
    env.mock_all_auths();

    client.add_feed(
        &String::from_str(&env, "BTC"),
        &Asset::Other(symbol_short!("BTC")),
    );

    let assets = client.assets();
    assert_eq!(assets.len(), 2);
}

#[test]
fn add_feed_duplicate_feed_fails() {
    let (client, _, _, env) = set_up();
    env.mock_all_auths();

    let result = client.try_add_feed(
        &String::from_str(&env, "ETH"),
        &Asset::Other(symbol_short!("ETHA")),
    );
    assert_eq!(
        result,
        Err(Ok(Error::from_contract_error(
            Sep40Error::DuplicatedFeed as u32
        )))
    );
}

#[test]
fn add_feed_duplicate_asset_fails() {
    let (client, _, _, env) = set_up();
    env.mock_all_auths();

    let result = client.try_add_feed(
        &String::from_str(&env, "BTC"),
        &Asset::Other(symbol_short!("ETH")),
    );
    assert_eq!(
        result,
        Err(Ok(Error::from_contract_error(
            Sep40Error::DuplicatedAsset as u32
        )))
    );
}

#[test]
fn update_feed_replaces_existing_asset() {
    let (client, _, _, env) = set_up();
    env.mock_all_auths();

    let new_asset = Asset::Stellar(Address::generate(&env));
    client.update_feed(&String::from_str(&env, "ETH"), &new_asset);

    let assets = client.assets();
    assert_eq!(assets.len(), 1);
    assert_asset_eq(&assets.get(0).unwrap(), &new_asset);
}

#[test]
fn update_feed_unknown_feed_fails() {
    let (client, _, _, env) = set_up();
    env.mock_all_auths();

    let result = client.try_update_feed(
        &String::from_str(&env, "BTC"),
        &Asset::Other(symbol_short!("BTC")),
    );
    assert_eq!(
        result,
        Err(Ok(Error::from_contract_error(
            Sep40Error::FeedNotFound as u32
        )))
    );
}

#[test]
fn update_feed_duplicate_asset_fails() {
    let (client, _, _, env) = set_up();
    env.mock_all_auths();

    client.add_feed(
        &String::from_str(&env, "BTC"),
        &Asset::Other(symbol_short!("BTC")),
    );

    let result = client.try_update_feed(
        &String::from_str(&env, "ETH"),
        &Asset::Other(symbol_short!("BTC")),
    );
    assert_eq!(
        result,
        Err(Ok(Error::from_contract_error(
            Sep40Error::DuplicatedAsset as u32
        )))
    );
}

#[test]
fn update_feed_same_asset_succeeds() {
    let (client, _, _, env) = set_up();
    env.mock_all_auths();

    client.update_feed(
        &String::from_str(&env, "ETH"),
        &Asset::Other(symbol_short!("ETH")),
    );

    let assets = client.assets();
    assert_eq!(assets.len(), 1);
    assert_asset_eq(&assets.get(0).unwrap(), &Asset::Other(symbol_short!("ETH")));
}

#[test]
fn remove_feed_removes_mapping() {
    let (client, _, _, env) = set_up();
    env.mock_all_auths();

    client.remove_feed(&String::from_str(&env, "ETH"));

    assert_eq!(client.assets().len(), 0);
}

#[test]
fn remove_feed_unknown_feed_fails() {
    let (client, _, _, env) = set_up();
    env.mock_all_auths();

    let result = client.try_remove_feed(&String::from_str(&env, "UNKNOWN"));
    assert_eq!(
        result,
        Err(Ok(Error::from_contract_error(
            Sep40Error::FeedNotFound as u32
        )))
    );
}

#[test]
fn lastprice_returns_converted_data() {
    let (client, _, adapter_id, env) = set_up();

    let mock = MockAdapterClient::new(&env, &adapter_id);
    let feed = String::from_str(&env, "ETH");
    let pd = make_price_data(&env, PRICE_B, PKG_TS_A, WRITE_TS_A);
    mock.set_price(&feed, &pd);

    let result = client.lastprice(&Asset::Other(symbol_short!("ETH")));
    assert!(result.is_some());

    let sep40 = result.unwrap();
    assert_eq!(sep40.price, PRICE_B as i128);
    assert_eq!(sep40.timestamp, SEP40_TS_A);
}

#[test]
fn lastprice_unknown_asset_returns_none() {
    let (client, ..) = set_up();

    let result = client.lastprice(&Asset::Other(symbol_short!("UNKNOWN")));
    assert!(result.is_none());
}

#[test]
fn price_finds_matching_timestamp() {
    let (client, _, adapter_id, env) = set_up();

    let mock = MockAdapterClient::new(&env, &adapter_id);
    let feed = String::from_str(&env, "ETH");

    let mut history = Vec::new(&env);
    history.push_back(make_price_data(&env, PRICE_A, PKG_TS_A, WRITE_TS_A));
    history.push_back(make_price_data(&env, PRICE_B, PKG_TS_B, WRITE_TS_B));
    history.push_back(make_price_data(&env, PRICE_C, PKG_TS_C, WRITE_TS_C));
    mock.set_history(&feed, &history);

    let result = client.price(&Asset::Other(symbol_short!("ETH")), &SEP40_TS_B);
    assert!(result.is_some());

    let sep40 = result.unwrap();
    assert_eq!(sep40.price, PRICE_B as i128);
    assert_eq!(sep40.timestamp, SEP40_TS_B);
}

#[test]
fn price_no_match_returns_none() {
    let (client, _, adapter_id, env) = set_up();

    let mock = MockAdapterClient::new(&env, &adapter_id);
    let feed = String::from_str(&env, "ETH");

    let mut history = Vec::new(&env);
    history.push_back(make_price_data(&env, PRICE_B, PKG_TS_A, WRITE_TS_A));
    mock.set_history(&feed, &history);

    let result = client.price(&Asset::Other(symbol_short!("ETH")), &NON_MATCHING_TS);
    assert!(result.is_none());
}

#[test]
fn prices_returns_latest_records() {
    let (client, _, adapter_id, env) = set_up();

    let mock = MockAdapterClient::new(&env, &adapter_id);
    let feed = String::from_str(&env, "ETH");

    let mut history = Vec::new(&env);
    history.push_back(make_price_data(&env, PRICE_A, PKG_TS_A, WRITE_TS_A));
    history.push_back(make_price_data(&env, PRICE_B, PKG_TS_B, WRITE_TS_B));
    history.push_back(make_price_data(&env, PRICE_C, PKG_TS_C, WRITE_TS_C));
    mock.set_history(&feed, &history);

    let result = client.prices(&Asset::Other(symbol_short!("ETH")), &HISTORY_LIMIT);
    assert!(result.is_some());

    let prices = result.unwrap();
    assert_eq!(prices.len(), 2);
    assert_eq!(prices.get(0).unwrap().price, PRICE_B as i128);
    assert_eq!(prices.get(1).unwrap().price, PRICE_C as i128);
}

#[test]
fn prices_unknown_asset_returns_none() {
    let (client, ..) = set_up();

    let result = client.prices(&Asset::Other(symbol_short!("UNKNOWN")), &PRICES_QUERY_LIMIT);
    assert!(result.is_none());
}

#[test]
fn admin_functions_require_owner() {
    let (client, _, _, env) = set_up();

    assert!(client
        .try_add_feed(
            &String::from_str(&env, ""),
            &Asset::Other(symbol_short!("UNKNOWN"))
        )
        .is_err());
    assert!(client
        .try_update_feed(
            &String::from_str(&env, ""),
            &Asset::Other(symbol_short!("UNKNOWN"))
        )
        .is_err());
    assert!(client
        .try_remove_feed(&String::from_str(&env, ""),)
        .is_err());
}
