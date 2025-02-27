use common::redstone::Value;
use core::fmt::Debug;
use multi_feed_price_adapter::multi_feed_price_adapter::multi_feed_price_adapter_test::MultiFeedPriceAdapterState;
use redstone_testing::env::run_env::{PriceAdapterRunEnv, RunMode};
use scrypto_test::prelude::*;

const PRICE_ADAPTER: &str = "MultiFeedPriceAdapter";
const ENTRY_POINT_INSTANTIATE: &str = "instantiate_with_mock_timestamp";
const ENTRY_POINT_READ_PRICE_DATA: &str = "read_price_data_raw";
const ENTRY_POINT_READ_PRICES: &str = "read_prices_raw";
const ENTRY_POINT_GET_PRICES: &str = "get_prices_raw";
const ENTRY_POINT_WRITE_PRICES: &str = "write_prices_raw";

pub(crate) struct MultiFeedPriceAdapterSimEnv {
    component: ComponentAddress,
    public_key: Secp256k1PublicKey,
    ledger: LedgerSimulator<NoExtension, InMemorySubstateDatabase>,
}

impl PriceAdapterRunEnv for MultiFeedPriceAdapterSimEnv {
    type State = MultiFeedPriceAdapterState;

    fn instantiate(unique_signer_count: u8, signers: Vec<Vec<u8>>, timestamp: Option<u64>) -> Self {
        let mut ledger = LedgerSimulatorBuilder::new().build();
        let (public_key, _private_key, _) = ledger.new_allocated_account();
        let package_address = ledger.compile_and_publish(this_package!());

        let manifest = ManifestBuilder::new()
            .lock_fee_from_faucet()
            .call_function(
                package_address,
                PRICE_ADAPTER,
                ENTRY_POINT_INSTANTIATE,
                manifest_args!(unique_signer_count, signers, timestamp),
            )
            .build();
        let receipt = ledger.execute_manifest(
            manifest,
            vec![NonFungibleGlobalId::from_public_key(&public_key)],
        );

        let component = receipt.expect_commit_success().new_component_addresses()[0];

        Self {
            component,
            ledger,
            public_key,
        }
    }

    fn state(&self) -> MultiFeedPriceAdapterState {
        self.ledger
            .component_state::<MultiFeedPriceAdapterState>(self.component)
    }

    fn read_timestamp(&mut self, feed_id: Option<&str>) -> u64 {
        let feed_ids: Vec<Vec<u8>> = vec![feed_id.unwrap().into()];
        let price_data = self.call_method::<Vec<(Value, u64, u64)>>(
            ENTRY_POINT_READ_PRICE_DATA,
            manifest_args!(feed_ids),
        );

        price_data.first().unwrap().1
    }

    fn read_prices(&mut self, feed_ids: Vec<Vec<u8>>) -> Vec<Value> {
        self.call_method(ENTRY_POINT_READ_PRICES, manifest_args!(feed_ids))
    }

    fn process_payload(
        &mut self,
        run_mode: RunMode,
        payload: Vec<u8>,
        feed_ids: Vec<Vec<u8>>,
        _timestamp: u64,
    ) -> (u64, Vec<Value>) {
        let (timestamp, values): (_, Vec<Value>) = self.call_method(
            if run_mode == RunMode::Get {
                ENTRY_POINT_GET_PRICES
            } else {
                ENTRY_POINT_WRITE_PRICES
            },
            manifest_args!(feed_ids, payload),
        );

        (timestamp, values)
    }

    fn increase_time(&mut self) {
        // nop here
    }
}

impl MultiFeedPriceAdapterSimEnv {
    fn call_method<V: ScryptoDecode + Eq + Debug>(
        &mut self,
        name: &str,
        args: impl ResolvableArguments,
    ) -> V {
        let manifest = ManifestBuilder::new()
            .lock_fee_from_faucet()
            .call_method(self.component, name, args)
            .build();
        let receipt = self.ledger.execute_manifest(
            manifest,
            vec![NonFungibleGlobalId::from_public_key(&self.public_key)],
        );

        let outputs = receipt.expect_commit_success().outcome.expect_success();

        Self::decode(outputs[1].clone())
    }

    fn decode<V: ScryptoDecode + Eq + Debug>(output: InstructionOutput) -> V {
        match output {
            InstructionOutput::CallReturn(buf) => {
                scrypto_decode(buf.as_slice()).expect("Value does not decode to type")
            }
            InstructionOutput::None => {
                panic!("Expected value but was None");
            }
        }
    }
}
