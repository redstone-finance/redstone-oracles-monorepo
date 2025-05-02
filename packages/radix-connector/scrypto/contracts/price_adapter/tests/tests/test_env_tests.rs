use crate::env::test_env::PriceAdapterTestEnv;
use std::time::Duration;

use redstone_testing::primary_signers_scenarios::{
    scenario_adapter_update_with_almost_future_timestamp,
    scenario_adapter_update_with_almost_old_timestamp,
    scenario_adapter_update_with_future_timestamp, scenario_adapter_update_with_old_timestamp,
    scenario_check_initalization, scenario_missing_feed_in_payload,
    scenario_trusted_updates_twice_without_waiting_for_threshold,
    scenario_untrusted_updates_twice_waiting_for_threshold,
    scenario_untrusted_updates_twice_without_waiting_for_threshold,
    scenario_updating_twice_with_the_same_timestamp, scenario_updating_with_only_2_signers,
    scenario_with_5_signers,
};

#[test]
fn check_initalization() {
    let env = PriceAdapterTestEnv::new();
    let scenario = scenario_check_initalization();

    scenario.run(env);
}

#[test]
#[should_panic(
    expected = "Current update timestamp: 1744563520000 must be greater than latest update timestamp: 1744563500000"
)]
fn untrusted_updates_twice_without_waiting_for_threshold() {
    let env = PriceAdapterTestEnv::new();
    let scenario =
        scenario_untrusted_updates_twice_without_waiting_for_threshold(Duration::from_secs(40));

    scenario.run(env);
}

#[test]
fn trusted_updates_twice_without_waiting_for_threshold() {
    let env = PriceAdapterTestEnv::new();
    let scenario =
        scenario_trusted_updates_twice_without_waiting_for_threshold(Duration::from_secs(40));

    scenario.run(env);
}

#[test]
#[should_panic(
    expected = "Package timestamp: 1744563500000 must be greater than package timestamp before: 1744563500000"
)]
fn updating_twice_with_the_same_timestamp() {
    let env = PriceAdapterTestEnv::new();
    let scenario = scenario_updating_twice_with_the_same_timestamp();

    scenario.run(env);
}

#[test]
#[should_panic(expected = "Insufficient signer count")]
fn updating_with_only_2_signers() {
    let env = PriceAdapterTestEnv::new();
    let scenario = scenario_updating_with_only_2_signers();

    scenario.run(env);
}

#[test]
fn untrusted_updates_twice_waiting_for_threshold() {
    let env = PriceAdapterTestEnv::new();
    let scenario = scenario_untrusted_updates_twice_waiting_for_threshold(Duration::from_secs(40));

    scenario.run(env);
}

#[test]
#[should_panic]
fn missing_feed_in_payload() {
    let env = PriceAdapterTestEnv::new();
    let scenario = scenario_missing_feed_in_payload();

    scenario.run(env);
}

#[test]
fn with_5_signers() {
    let env = PriceAdapterTestEnv::new();
    let scenario = scenario_with_5_signers(Duration::from_secs(40));

    scenario.run(env);
}

#[test]
#[should_panic(expected = "Timestamp 1744563500000 is too old for #0")]
fn adapter_update_with_old_timestamp() {
    let env = PriceAdapterTestEnv::new();
    let scenario = scenario_adapter_update_with_old_timestamp(Duration::from_secs(60 * 15));

    scenario.run(env);
}

#[test]
#[should_panic(expected = "Timestamp 1744563500000 is too future for #0")]
fn adapter_update_with_future_timestamp() {
    let env = PriceAdapterTestEnv::new();
    let scenario = scenario_adapter_update_with_future_timestamp(Duration::from_secs(60 * 3));

    scenario.run(env);
}

#[test]
fn adapter_update_with_almost_old_timestamp() {
    let env = PriceAdapterTestEnv::new();
    let scenario = scenario_adapter_update_with_almost_old_timestamp(Duration::from_secs(60 * 15));

    scenario.run(env);
}

#[test]
fn adapter_update_with_almost_future_timestamp() {
    let env = PriceAdapterTestEnv::new();
    let scenario =
        scenario_adapter_update_with_almost_future_timestamp(Duration::from_secs(60 * 3));

    scenario.run(env);
}
