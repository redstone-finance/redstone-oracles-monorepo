use core::{cell::RefCell, ops::DerefMut};

use price_adapter::price_adapter::price_adapter_test::PriceAdapter;
use redstone_testing::{env::PriceAdapterRunEnv, redstone::Value, signer::ContractUpdateSigner};
use scrypto::time::Instant;
use scrypto_test::{
    environment::TestEnvironment,
    ledger_simulator::CompileProfile::Fast,
    prelude::{InMemorySubstateDatabase, PackageFactory},
    this_package,
};

pub(crate) struct PriceAdapterTestEnv {
    env: RefCell<TestEnvironment<InMemorySubstateDatabase>>,
    price_adapter: Option<PriceAdapter>,
}

impl PriceAdapterRunEnv for PriceAdapterTestEnv {
    fn initialize(&mut self, signers: Vec<Vec<u8>>, unique_signer_threshold: u8) {
        let package_address =
            PackageFactory::compile_and_publish(this_package!(), self.env.get_mut(), Fast).unwrap();

        let (price_adapter, _) = PriceAdapter::instantiate_with_trusted_updaters(
            unique_signer_threshold,
            signers,
            vec![],
            package_address,
            self.env.get_mut(),
        )
        .unwrap();

        self.price_adapter = Some(price_adapter);
    }

    fn set_time_to(&mut self, to: std::time::Duration) {
        self.env
            .get_mut()
            .set_current_time(Instant::new(to.as_secs() as i64));
        let epoch = self.env.get_mut().get_current_epoch();
        self.env.get_mut().set_current_epoch(epoch.next().unwrap());
    }

    fn unique_signer_threshold(&self) -> u8 {
        let mut env = self.env.borrow_mut();
        self.price_adapter
            .unwrap()
            .get_unique_signer_threshold(env.deref_mut())
            .unwrap()
    }

    fn read_timestamp(&mut self, feed_id: Option<&str>) -> u64 {
        let feed_ids = vec![feed_id.unwrap().into()];

        self.price_adapter
            .unwrap()
            .read_price_data(feed_ids, self.env.get_mut())
            .unwrap()
            .first()
            .unwrap()
            .timestamp
    }

    fn read_prices(&mut self, feed_ids: Vec<Vec<u8>>) -> Vec<Value> {
        self.price_adapter
            .unwrap()
            .read_prices_raw(feed_ids, self.env.get_mut())
            .unwrap()
    }

    fn read_prices_and_timestamp(&mut self, feed_ids: Vec<Vec<u8>>) -> (Vec<Value>, u64) {
        let prices = self
            .price_adapter
            .unwrap()
            .read_prices_raw(feed_ids.clone(), self.env.get_mut())
            .unwrap();
        let timestamp = self
            .price_adapter
            .unwrap()
            .read_timestamp(feed_ids[0].clone(), self.env.get_mut())
            .unwrap();

        (prices, timestamp)
    }

    fn process_payload(
        &mut self,
        payload: Vec<u8>,
        feed_ids: Vec<Vec<u8>>,
        signer: ContractUpdateSigner,
    ) {
        if matches!(signer, ContractUpdateSigner::Trusted) {
            self.price_adapter
                .unwrap()
                .write_prices_raw_trusted(feed_ids, payload, self.env.get_mut())
                .unwrap();
            return;
        }
        self.price_adapter
            .unwrap()
            .write_prices_raw(feed_ids, payload, self.env.get_mut())
            .unwrap();
    }

    fn process_payload_get(
        &mut self,
        _payload: Vec<u8>,
        _feed_ids: Vec<Vec<u8>>,
        _signer: ContractUpdateSigner,
    ) -> (Vec<Value>, u64) {
        todo!()
    }

    fn increase_time_by(&mut self, by: std::time::Duration) {
        let ct = self
            .env
            .get_mut()
            .get_current_time()
            .seconds_since_unix_epoch;
        self.env
            .get_mut()
            .set_current_time(Instant::new(ct + by.as_secs() as i64));
    }
}

impl PriceAdapterTestEnv {
    pub fn new() -> Self {
        let mut env = RefCell::new(TestEnvironment::new());
        env.get_mut().disable_auth_module();
        Self {
            env,
            price_adapter: None,
        }
    }
}
