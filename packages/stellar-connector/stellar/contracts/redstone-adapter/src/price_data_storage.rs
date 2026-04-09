use common::PriceData;
use soroban_sdk::{contracttype, Env, Error, Vec};

const TIMESTAMP_NOT_MONOTONIC: u32 = 42;

#[derive(Debug, Clone)]
#[contracttype]
pub struct PriceDataStorage {
    price_data: Vec<PriceData>,
}

impl PriceDataStorage {
    pub fn empty(env: &Env) -> Self {
        Self {
            price_data: Vec::new(env),
        }
    }

    pub fn get_last(&self) -> Option<PriceData> {
        self.price_data.last()
    }

    pub fn push(&mut self, new: PriceData, limit: u32) -> Result<(), Error> {
        match self.get_last() {
            Some(data) if data.package_timestamp > new.package_timestamp => {
                return Err(Error::from_contract_error(TIMESTAMP_NOT_MONOTONIC))
            },
            _ => (),
        }

        self.price_data.push_back(new);

        while self.price_data.len() > limit {
            self.price_data.pop_front();
        }

        Ok(())
    }

    pub fn get_all(&self) -> Vec<PriceData> {
        self.price_data.clone()
    }
}
