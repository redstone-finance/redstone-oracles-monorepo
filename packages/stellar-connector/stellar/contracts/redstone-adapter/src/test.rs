#![cfg(test)]

mod test_contract;

use core::time::Duration;

use redstone_testing::{
    primary_signers_scenarios::{
        scenario_2_feed_update, scenario_adapter_update_with_almost_future_timestamp,
        scenario_adapter_update_with_almost_old_timestamp,
        scenario_adapter_update_with_future_timestamp, scenario_adapter_update_with_old_timestamp,
        scenario_check_initalization, scenario_missing_feed_in_payload,
        scenario_payload_with_multiple_feed_update_one,
        scenario_trusted_updates_twice_without_waiting_for_threshold,
        scenario_untrusted_updates_twice_waiting_for_threshold,
        scenario_untrusted_updates_twice_without_waiting_for_threshold,
        scenario_updating_twice_with_the_same_timestamp, scenario_updating_with_only_2_signers,
        scenario_with_5_signers,
    },
    sample::{sample_btc_eth_3sig, sample_btc_eth_3sig_newer, Sample},
};
use soroban_sdk::{
    testutils::{storage::Persistent, Ledger},
    Bytes, Env, String, Vec as SorobanVec,
};

use self::test_contract::TestContract;
use crate::{
    config::{FEED_TTL_EXTEND_TO, FEED_TTL_SECS, FEED_TTL_THRESHOLD, STELLAR_CONFIG},
    Contract, ContractClient,
};

#[test]
fn check_initalization() {
    let contract = TestContract::new();
    let scenario = scenario_check_initalization();

    scenario.run(contract);
}

#[test]
#[should_panic(expected = "Error(Contract, #1102)")]
fn untrusted_updates_twice_without_waiting_for_threshold() {
    let contract = TestContract::new();
    let threshold = Duration::from_millis(STELLAR_CONFIG.min_interval_between_updates_ms);
    let scenario = scenario_untrusted_updates_twice_without_waiting_for_threshold(threshold);

    scenario.run(contract);
}

#[test]
fn trusted_updates_twice_without_waiting_for_threshold() {
    let contract = TestContract::new();
    let threshold = Duration::from_millis(STELLAR_CONFIG.min_interval_between_updates_ms);
    let scenario = scenario_trusted_updates_twice_without_waiting_for_threshold(threshold);

    scenario.run(contract);
}

#[test]
#[should_panic(expected = "Error(Contract, #1101)")]
fn updating_twice_with_the_same_timestamp() {
    let contract = TestContract::new();
    let scenario = scenario_updating_twice_with_the_same_timestamp();

    scenario.run(contract);
}

#[test]
#[should_panic(expected = "Error(Contract, #2002)")]
fn updating_with_only_2_signers() {
    let contract = TestContract::new();
    let scenario = scenario_updating_with_only_2_signers();

    scenario.run(contract);
}

#[test]
fn untrusted_updates_twice_waiting_for_threshold() {
    let contract = TestContract::new();
    let threshold = Duration::from_millis(STELLAR_CONFIG.min_interval_between_updates_ms);
    let scenario = scenario_untrusted_updates_twice_waiting_for_threshold(threshold);

    scenario.run(contract);
}

#[test]
#[should_panic(expected = "Error(Contract, #2000)")]
fn missing_feed_in_payload() {
    let contract = TestContract::new();
    let scenario = scenario_missing_feed_in_payload();

    scenario.run(contract);
}

#[test]
fn with_5_signers() {
    let contract = TestContract::new();
    let threshold = Duration::from_millis(STELLAR_CONFIG.min_interval_between_updates_ms);
    let scenario = scenario_with_5_signers(threshold);

    scenario.run(contract);
}

#[test]
#[should_panic(expected = "Error(Contract, #1000)")]
fn adapter_update_with_old_timestamp() {
    let contract = TestContract::new();
    let max_timestamp_delay = Duration::from_millis(STELLAR_CONFIG.max_timestamp_delay_ms);
    let scenario = scenario_adapter_update_with_old_timestamp(max_timestamp_delay);

    scenario.run(contract);
}

#[test]
#[should_panic(expected = "Error(Contract, #1050)")]
fn adapter_update_with_future_timestamp() {
    let contract = TestContract::new();
    let max_timestamp_ahead = Duration::from_millis(STELLAR_CONFIG.max_timestamp_ahead_ms);
    let scenario = scenario_adapter_update_with_future_timestamp(max_timestamp_ahead);

    scenario.run(contract);
}

#[test]
fn adapter_update_with_almost_old_timestamp() {
    let contract = TestContract::new();
    let max_timestamp_delay = Duration::from_millis(STELLAR_CONFIG.max_timestamp_delay_ms);
    let scenario = scenario_adapter_update_with_almost_old_timestamp(max_timestamp_delay);

    scenario.run(contract);
}

#[test]
fn adapter_update_with_almost_future_timestamp() {
    let contract = TestContract::new();
    let max_timestamp_ahead = Duration::from_millis(STELLAR_CONFIG.max_timestamp_ahead_ms);
    let scenario = scenario_adapter_update_with_almost_future_timestamp(max_timestamp_ahead);

    scenario.run(contract);
}

#[test]
fn update_two_feeds() {
    let contract = TestContract::new();
    let threshold = Duration::from_millis(STELLAR_CONFIG.min_interval_between_updates_ms);
    let scenario = scenario_2_feed_update(threshold);

    scenario.run(contract);
}

#[test]
fn update_one_feed_when_payload_has_multiple() {
    let contract = TestContract::new();
    let threshold = Duration::from_millis(STELLAR_CONFIG.min_interval_between_updates_ms);
    let scenario = scenario_payload_with_multiple_feed_update_one(threshold);

    scenario.run(contract);
}

fn write_prices(client: &ContractClient, sample: Sample, expected_ttl: u32) {
    let env = &client.env;

    let btc = String::from_str(env, "BTC");
    let payload = hex::decode(sample.content).unwrap();
    let payload = Bytes::from_slice(env, &payload);

    env.ledger().set_timestamp(sample.timestamp / 1000);
    client.write_prices(
        &client.address,
        &SorobanVec::from_array(env, [btc.clone()]),
        &payload,
    );

    env.as_contract(&client.address, || {
        let ttl = env.storage().persistent().get_ttl(&btc);
        assert!(ttl >= FEED_TTL_SECS / 5);
        assert_eq!(ttl, expected_ttl);
    });
}

#[test]
fn test_feeds_storage_ttl() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    write_prices(&client, sample_btc_eth_3sig(), FEED_TTL_EXTEND_TO);
}

#[test]
fn test_feeds_storage_ttl_update_before_threshold() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    write_prices(&client, sample_btc_eth_3sig(), FEED_TTL_EXTEND_TO);

    let move_ledgers = FEED_TTL_EXTEND_TO - FEED_TTL_THRESHOLD - 1;
    env.ledger().set_sequence_number(move_ledgers);

    write_prices(
        &client,
        sample_btc_eth_3sig_newer(),
        FEED_TTL_EXTEND_TO - move_ledgers,
    );
}

#[test]
fn test_feeds_storage_ttl_update_after_threshold() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    write_prices(&client, sample_btc_eth_3sig(), FEED_TTL_EXTEND_TO);

    let move_ledgers = FEED_TTL_EXTEND_TO - FEED_TTL_THRESHOLD;
    env.ledger().set_sequence_number(move_ledgers);

    write_prices(
        &client,
        sample_btc_eth_3sig_newer(),
        2 * FEED_TTL_EXTEND_TO - FEED_TTL_THRESHOLD - move_ledgers,
    );
}
