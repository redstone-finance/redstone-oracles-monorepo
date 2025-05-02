use core::{fmt::Debug, ops::Add, time::Duration};
use price_adapter::price_adapter::price_adapter_test::PriceAdapterState;
use redstone_testing::{env::PriceAdapterRunEnv, redstone::Value, signer::ContractUpdateSigner};
use scrypto_test::prelude::*;

const PRICE_ADAPTER: &str = "PriceAdapter";
const ENTRY_POINT_INSTANTIATE: &str = "instantiate_with_trusted_updaters";
const ENTRY_POINT_READ_PRICE_DATA: &str = "read_price_data_raw";
const ENTRY_POINT_READ_PRICES: &str = "read_prices_raw";
const ENTRY_POINT_WRITE_PRICES: &str = "write_prices_raw";
const ENTRY_POINT_WRITE_PRICES_TRUSTED: &str = "write_prices_raw_trusted";

type Simulator = LedgerSimulator<NoExtension, InMemorySubstateDatabase>;

fn setup_sim() -> (
    Simulator,
    Secp256k1PublicKey,
    Secp256k1PublicKey,
    PackageAddress,
    ComponentAddress,
) {
    let mut ledger = LedgerSimulatorBuilder::new().build();
    let (trusted_public_key, _private_key, trusted_address) = ledger.new_allocated_account();
    let (untrusted_public_key, _private_key, _) = ledger.new_allocated_account();
    let package_address = ledger.compile_and_publish(this_package!());

    (
        ledger,
        trusted_public_key,
        untrusted_public_key,
        package_address,
        trusted_address,
    )
}

pub(crate) struct PriceAdapterSimEnv {
    component: Option<ComponentAddress>,
    trusted: Secp256k1PublicKey,
    untrusted: Secp256k1PublicKey,
    ledger: Simulator,
    package_address: PackageAddress,
    trusted_address: ComponentAddress,
    trusted_badge: Option<ResourceAddress>,
}

impl PriceAdapterSimEnv {
    pub fn new() -> Self {
        let (ledger, trusted_public_key, untrusted_public_key, package_address, trusted_address) =
            setup_sim();

        Self {
            ledger,
            trusted: trusted_public_key,
            untrusted: untrusted_public_key,
            package_address,
            trusted_address,
            component: None,
            trusted_badge: None,
        }
    }
}

impl PriceAdapterRunEnv for PriceAdapterSimEnv {
    fn initialize(&mut self, signers: Vec<Vec<u8>>, unique_signer_threshold: u8) {
        let manifest = ManifestBuilder::new()
            .lock_fee_from_faucet()
            .call_function(
                self.package_address,
                PRICE_ADAPTER,
                ENTRY_POINT_INSTANTIATE,
                manifest_args!(
                    unique_signer_threshold,
                    signers,
                    vec![self.trusted_address.to_hex()]
                ),
            )
            .deposit_batch(self.trusted_address, ManifestExpression::EntireWorktop)
            .build();

        let receipt = self.ledger.execute_manifest(
            manifest,
            vec![NonFungibleGlobalId::from_public_key(&self.trusted)],
        );

        let commit = receipt.expect_commit_success();

        let component = commit.new_component_addresses()[0];
        let trusted_badge = commit.new_resource_addresses()[0];

        self.component = Some(component);
        self.trusted_badge = Some(trusted_badge);
    }

    fn read_timestamp(&mut self, feed_id: Option<&str>) -> u64 {
        let feed_ids: Vec<Vec<u8>> = vec![feed_id.unwrap().into()];
        let price_data = self.call_method::<Vec<(Value, u64, u64)>>(
            ENTRY_POINT_READ_PRICE_DATA,
            manifest_args!(feed_ids),
            ContractUpdateSigner::Trusted,
        );

        price_data.first().unwrap().1
    }

    fn read_prices(&mut self, feed_ids: Vec<Vec<u8>>) -> Vec<Value> {
        self.call_method(
            ENTRY_POINT_READ_PRICES,
            manifest_args!(feed_ids),
            ContractUpdateSigner::Untrusted,
        )
    }

    fn process_payload(
        &mut self,
        payload: Vec<u8>,
        feed_ids: Vec<Vec<u8>>,
        updater: ContractUpdateSigner,
    ) {
        let method = match updater {
            ContractUpdateSigner::Trusted => ENTRY_POINT_WRITE_PRICES_TRUSTED,
            ContractUpdateSigner::Untrusted => ENTRY_POINT_WRITE_PRICES,
        };
        let (_, _): (u64, Vec<Value>) =
            self.call_method(method, manifest_args!(feed_ids, payload), updater);
    }

    fn set_time_to(&mut self, to: std::time::Duration) {
        self.ledger
            .advance_to_round_at_timestamp(Round::of(12), to.as_millis() as i64);
    }

    fn unique_signer_threshold(&self) -> u8 {
        self.state().signer_count_threshold
    }

    fn read_prices_and_timestamp(&mut self, feed_ids: Vec<Vec<u8>>) -> (Vec<Value>, u64) {
        let price_data = self.call_method::<Vec<(Value, u64, u64)>>(
            ENTRY_POINT_READ_PRICE_DATA,
            manifest_args!(feed_ids),
            ContractUpdateSigner::Trusted,
        );

        let timestamp = price_data[0].1;
        (price_data.into_iter().map(|x| x.0).collect(), timestamp)
    }

    fn process_payload_get(
        &mut self,
        _payload: Vec<u8>,
        _feed_ids: Vec<Vec<u8>>,
        _signer: redstone_testing::signer::ContractUpdateSigner,
    ) -> (Vec<Value>, u64) {
        todo!()
    }

    fn increase_time_by(&mut self, by: std::time::Duration) {
        let current_tm = self.ledger.get_current_proposer_timestamp_ms();
        self.set_time_to(by.add(Duration::from_millis(current_tm as u64)));
    }
}

impl PriceAdapterSimEnv {
    fn call_method<V: ScryptoDecode + Eq + Debug>(
        &mut self,
        name: &str,
        args: impl ResolvableArguments,
        signer: ContractUpdateSigner,
    ) -> V {
        match signer {
            ContractUpdateSigner::Trusted => self.call_as_trusted(name, args),
            ContractUpdateSigner::Untrusted => self.call_as_untrusted(name, args),
        }
    }

    fn call_as_trusted<V: ScryptoDecode + Eq + Debug>(
        &mut self,
        name: &str,
        args: impl ResolvableArguments,
    ) -> V {
        let manifest = ManifestBuilder::new()
            .lock_fee_from_faucet()
            .create_proof_from_account_of_non_fungible(
                self.trusted_address,
                NonFungibleGlobalId::new(
                    self.trusted_badge.unwrap(),
                    NonFungibleLocalId::string(self.trusted_address.to_hex()).unwrap(),
                ),
            )
            .call_method(self.component.unwrap(), name, args)
            .build();
        let receipt = self.ledger.execute_manifest(
            manifest,
            vec![NonFungibleGlobalId::from_public_key(&self.trusted)],
        );

        let outputs = receipt.expect_commit_success().outcome.expect_success();
        Self::decode(outputs[2].clone())
    }

    fn call_as_untrusted<V: ScryptoDecode + Eq + Debug>(
        &mut self,
        name: &str,
        args: impl ResolvableArguments,
    ) -> V {
        let manifest = ManifestBuilder::new()
            .lock_fee_from_faucet()
            .call_method(self.component.unwrap(), name, args)
            .build();
        let receipt = self.ledger.execute_manifest(
            manifest,
            vec![NonFungibleGlobalId::from_public_key(&self.untrusted)],
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

    fn state(&self) -> PriceAdapterState {
        self.ledger
            .component_state::<PriceAdapterState>(self.component.unwrap())
    }
}
