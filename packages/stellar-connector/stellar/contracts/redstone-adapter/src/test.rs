#![cfg(test)]

mod test_contract;

use core::time::Duration;

use redstone_testing::primary_signers_scenarios::{
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
};

use self::test_contract::TestContract;
use crate::config::STELLAR_CONFIG;

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
