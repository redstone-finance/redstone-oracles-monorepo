use alloc::vec::Vec;
use core::time::Duration;

use redstone_testing::{env::PriceAdapterRunEnv, redstone::Value, signer::ContractUpdateSigner};
use soroban_sdk::{testutils::Ledger, Bytes, Env, String, Vec as SorobanVec};

use crate::{config::STELLAR_CONFIG, Contract, ContractClient};

pub struct TestContract(ContractClient<'static>);

impl TestContract {
    pub fn new() -> Self {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(Contract, ());
        let contract = ContractClient::new(&env, &contract_id);

        Self(contract)
    }
}

impl PriceAdapterRunEnv for TestContract {
    fn set_time_to(&mut self, to: Duration) {
        self.0.env.ledger().set_timestamp(to.as_secs());
    }

    fn unique_signer_threshold(&self) -> u8 {
        self.0.unique_signer_threshold().try_into().unwrap()
    }

    fn initialize(&mut self, _signers: Vec<Vec<u8>>, _unique_signer_threshold: u8) {}

    fn read_timestamp(&mut self, _feed_id: Option<&str>) -> u64 {
        unimplemented!("Below tests do not require this method yet")
    }

    fn read_prices(&mut self, _feed_ids: Vec<Vec<u8>>) -> Vec<Value> {
        unimplemented!("Below tests do not require this method yet")
    }

    fn read_prices_and_timestamp(&mut self, feed_ids: Vec<Vec<u8>>) -> (Vec<Value>, u64) {
        let feed_ids: Vec<String> = feed_ids
            .into_iter()
            .map(|id| String::from_bytes(&self.0.env, &id))
            .collect();
        let feed_ids = SorobanVec::from_slice(&self.0.env, &feed_ids);

        let price_data = self.0.read_price_data(&feed_ids);

        let timestamp = price_data.first().unwrap().package_timestamp;
        let prices = price_data
            .into_iter()
            .map(|pd| pd.price.to_be_bytes().to_alloc_vec().into())
            .collect();

        (prices, timestamp)
    }

    fn process_payload(
        &mut self,
        payload: Vec<u8>,
        feed_ids: Vec<Vec<u8>>,
        signer: ContractUpdateSigner,
    ) {
        let payload = Bytes::from_slice(&self.0.env, &payload);
        let feed_ids: Vec<String> = feed_ids
            .into_iter()
            .map(|id| String::from_bytes(&self.0.env, &id))
            .collect();
        let feed_ids = SorobanVec::from_slice(&self.0.env, &feed_ids);

        let address = match signer {
            ContractUpdateSigner::Trusted => &STELLAR_CONFIG.trusted_updaters(&self.0.env)[0],
            ContractUpdateSigner::Untrusted => &self.0.address,
        };

        self.0.write_prices(address, &feed_ids, &payload);
    }

    fn process_payload_get(
        &mut self,
        _payload: Vec<u8>,
        _feed_ids: Vec<Vec<u8>>,
        _signer: ContractUpdateSigner,
    ) -> (Vec<Value>, u64) {
        unimplemented!("Below tests do not require this method yet")
    }

    fn increase_time_by(&mut self, by: Duration) {
        let timestamp = self.0.env.ledger().timestamp();
        self.0.env.ledger().set_timestamp(timestamp + by.as_secs());
    }
}
