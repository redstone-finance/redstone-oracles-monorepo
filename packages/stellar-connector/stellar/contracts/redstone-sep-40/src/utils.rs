use common::{redstone_adapter::RedStoneAdapterClient, PriceData};
use sep_40_oracle::Asset;
use soroban_sdk::{Address, Env};

use crate::{config::ADAPTER_ADDRESS, Sep40PriceData, ONE_SEC};

pub fn price_data_to_sep_40(price_data: PriceData) -> Option<Sep40PriceData> {
    let price = price_data.price.to_u128()?.try_into().ok()?;

    Some(Sep40PriceData {
        price,
        timestamp: price_data.package_timestamp / ONE_SEC.as_millis() as u64,
    })
}

pub fn asset_eq(a: &Asset, b: &Asset) -> bool {
    match (a, b) {
        (Asset::Stellar(addr_a), Asset::Stellar(addr_b)) => addr_a == addr_b,
        (Asset::Other(sym_a), Asset::Other(sym_b)) => sym_a == sym_b,
        _ => false,
    }
}

pub fn get_adapter_client(env: &Env) -> RedStoneAdapterClient<'_> {
    let adapter_address = Address::from_str(env, ADAPTER_ADDRESS);

    RedStoneAdapterClient::new(env, &adapter_address)
}
