use common::redstone::Value;
use price_adapter::price_adapter::price_adapter_test::PriceAdapter;
use redstone_testing::env::run_env::{PriceAdapterRunEnv, RunMode};
use scrypto::time::Instant;
use scrypto_test::{
    environment::TestEnvironment,
    ledger_simulator::CompileProfile::Fast,
    prelude::{InMemorySubstateDatabase, PackageFactory},
    this_package,
};

pub(crate) struct PriceAdapterTestEnv {
    env: TestEnvironment<InMemorySubstateDatabase>,
    price_adapter: PriceAdapter,
}

impl PriceAdapterRunEnv for PriceAdapterTestEnv {
    type State = ();

    fn instantiate(unique_signer_count: u8, signers: Vec<Vec<u8>>, timestamp: Option<u64>) -> Self {
        let mut env = TestEnvironment::new();

        if timestamp.is_some() {
            env.set_current_time(Instant::new(timestamp.unwrap() as i64));
            let epoch = env.get_current_epoch();
            env.set_current_epoch(epoch.next().unwrap());
            env.set_current_time(Instant::new(timestamp.unwrap() as i64));
        }

        let package_address =
            PackageFactory::compile_and_publish(this_package!(), &mut env, Fast).unwrap();

        let price_adapter = PriceAdapter::instantiate_with_mock_timestamp(
            unique_signer_count,
            signers,
            timestamp,
            package_address,
            &mut env,
        )
        .unwrap();

        Self { env, price_adapter }
    }

    fn state(&self) -> Self::State {}

    fn read_timestamp(&mut self, _feed_id: Option<&str>) -> u64 {
        self.price_adapter.read_timestamp(&mut self.env).unwrap()
    }

    fn read_prices(&mut self, feed_ids: Vec<Vec<u8>>) -> Vec<Value> {
        self.price_adapter
            .read_prices_raw(feed_ids, &mut self.env)
            .unwrap()
    }

    fn process_payload(
        &mut self,
        run_mode: RunMode,
        payload: Vec<u8>,
        feed_ids: Vec<Vec<u8>>,
        _timestamp: u64,
    ) -> (u64, Vec<Value>) {
        let (timestamp, values) = match run_mode {
            RunMode::Get => self
                .price_adapter
                .get_prices_raw(feed_ids, payload, &mut self.env),
            RunMode::Write => self
                .price_adapter
                .write_prices_raw(feed_ids, payload, &mut self.env),
        }
        .unwrap();

        (timestamp, values)
    }

    fn increase_time(&mut self) {
        let ct = self.env.get_current_time().seconds_since_unix_epoch;
        self.env.set_current_time(Instant::new(ct + 1));
    }
}
