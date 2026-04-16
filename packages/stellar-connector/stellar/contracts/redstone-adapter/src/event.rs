use common::PriceData;
use soroban_sdk::{contracttype, symbol_short, xdr::ToXdr, Address, Event, Symbol, Vec};

const WRITE_PRICES_TOPIC: Symbol = symbol_short!("REDSTONE");

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct WritePrices {
    pub updater: Address,
    pub updated_feeds: Vec<PriceData>,
}

impl Event for WritePrices {
    fn topics(&self, env: &soroban_sdk::Env) -> Vec<soroban_sdk::Val> {
        Vec::from_array(env, [WRITE_PRICES_TOPIC.to_val()])
    }

    fn data(&self, env: &soroban_sdk::Env) -> soroban_sdk::Val {
        ToXdr::to_xdr(self, env).to_val()
    }
}
