#[cfg(test)]
use {
    core::time::Duration,
    environment::Env,
    redstone_testing::primary_signers_scenarios::{
        scenario_adapter_update_with_almost_future_timestamp,
        scenario_adapter_update_with_almost_old_timestamp,
        scenario_adapter_update_with_future_timestamp, scenario_adapter_update_with_old_timestamp,
        scenario_check_initalization, scenario_missing_feed_in_payload,
        scenario_trusted_updates_twice_without_waiting_for_threshold,
        scenario_untrusted_updates_twice_waiting_for_threshold,
        scenario_untrusted_updates_twice_without_waiting_for_threshold,
        scenario_updating_twice_with_the_same_timestamp, scenario_updating_with_only_2_signers,
        scenario_with_5_signers,
    },
};

pub mod environment;

#[test]
fn check_initalization() {
    let env = Env::new();
    let scenario = scenario_check_initalization();

    scenario.run(env);
}

#[test]
#[should_panic(expected = "Error Code: rust-sdk. Error Number: 1102")]
fn untrusted_updates_twice_without_waiting_for_threshold() {
    let env = Env::new();
    let scenario =
        scenario_untrusted_updates_twice_without_waiting_for_threshold(Duration::from_secs(40));

    scenario.run(env);
}

#[test]
fn trusted_updates_twice_without_waiting_for_threshold() {
    let env = Env::new();
    let scenario =
        scenario_trusted_updates_twice_without_waiting_for_threshold(Duration::from_secs(40));

    scenario.run(env);
}

#[test]
#[should_panic(expected = "Error Code: rust-sdk. Error Number: 1101")]
fn updating_twice_with_the_same_timestamp() {
    let env = Env::new();
    let scenario = scenario_updating_twice_with_the_same_timestamp();

    scenario.run(env);
}

#[test]
#[should_panic(
    expected = "Error Code: rust-sdk. Error Number: 510. Error Message: Array is empty."
)]
fn updating_with_only_2_signers() {
    let env = Env::new();
    let scenario = scenario_updating_with_only_2_signers();

    scenario.run(env);
}

#[test]
fn untrusted_updates_twice_waiting_for_threshold() {
    let env = Env::new();
    let scenario = scenario_untrusted_updates_twice_waiting_for_threshold(Duration::from_secs(40));

    scenario.run(env);
}

#[test]
#[should_panic(
    expected = "Error Code: rust-sdk. Error Number: 510. Error Message: Array is empty."
)]
fn missing_feed_in_payload() {
    let env = Env::new();
    let scenario = scenario_missing_feed_in_payload();

    scenario.run(env);
}

#[test]
fn with_5_signers() {
    let env = Env::new();
    let scenario = scenario_with_5_signers(Duration::from_secs(40));

    scenario.run(env);
}

#[test]
#[should_panic(expected = "rust-sdk. Error Number: 1000")]
fn adapter_update_with_old_timestamp() {
    let env = Env::new();
    let scenario = scenario_adapter_update_with_old_timestamp(Duration::from_secs(60 * 3));

    scenario.run(env);
}

#[test]
#[should_panic(expected = "rust-sdk. Error Number: 1050")]
fn adapter_update_with_future_timestamp() {
    let env = Env::new();
    let scenario = scenario_adapter_update_with_future_timestamp(Duration::from_secs(60 * 3));

    scenario.run(env);
}

#[test]
fn adapter_update_with_almost_old_timestamp() {
    let env = Env::new();
    let scenario = scenario_adapter_update_with_almost_old_timestamp(Duration::from_secs(60 * 3));

    scenario.run(env);
}

#[test]
fn adapter_update_with_almost_future_timestamp() {
    let env = Env::new();
    let scenario =
        scenario_adapter_update_with_almost_future_timestamp(Duration::from_secs(60 * 3));

    scenario.run(env);
}
