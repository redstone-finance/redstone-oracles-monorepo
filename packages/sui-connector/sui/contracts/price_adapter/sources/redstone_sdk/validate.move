// ==== Imports ===

module redstone_price_adapter::redstone_sdk_validate;

use redstone_price_adapter::redstone_sdk_config::{
    Config,
    signer_count_threshold,
    signers,
    max_timestamp_ahead_ms,
    max_timestamp_delay_ms
};
use redstone_price_adapter::redstone_sdk_data_package::{DataPackage, signer_address, timestamp};
use redstone_price_adapter::result::{Result, error, ok};
use redstone_price_adapter::unit::{Unit, unit};
use sui::vec_set;

// === Constants ===]

const REDSTONE_MARKER: vector<u8> = x"000002ed57011e0000";
const REDSTONE_MARKER_LEN: u64 = 9;

// === Public Functions ===

public fun verify_data_packages(
    data_packages: &vector<DataPackage>,
    config: &Config,
    current_timestamp: u64,
): Result<Unit> {
    let timestamps_are_the_same_result = verify_timestamps_are_the_same(data_packages);
    if (!timestamps_are_the_same_result.is_ok()) {
        return timestamps_are_the_same_result
    };

    // verify that packages timestamp is not stale
    let timestamp_verification_result = verify_timestamp(
        timestamp(&data_packages[0]),
        config,
        current_timestamp,
    );
    if (!timestamp_verification_result.is_ok()) {
        return timestamp_verification_result
    };

    verify_signer_count(
        data_packages,
        signer_count_threshold(config),
        &signers(config),
    )
}

public fun verify_redstone_marker(bytes: &vector<u8>): Result<Unit> {
    let bytes_len = bytes.length();

    if (bytes_len < REDSTONE_MARKER_LEN) {
        return error(b"Bad redstone marker, not enough bytes")
    };

    let marker = REDSTONE_MARKER;
    let start_index = bytes_len - REDSTONE_MARKER_LEN;
    let mut i = 0;

    while (i < REDSTONE_MARKER_LEN) {
        if (bytes[start_index + i] != marker[i]) {
            return error(b"Bad redstone marker, byte missmatch")
        };
        i = i + 1;
    };

    ok(unit())
}

// === Private Functions ===

fun verify_timestamps_are_the_same(data_packages: &vector<DataPackage>): Result<Unit> {
    if (data_packages.is_empty()) {
        return error(b"Empty data packages")
    };

    let expected_timestamp = data_packages[0].timestamp();
    let mut i = 1;

    while (i < data_packages.length()) {
        let actual_timestamp = data_packages[i].timestamp();

        if (actual_timestamp != expected_timestamp) {
            return error(b"Not all timestamps are the same")
        };

        i = i + 1;
    };

    ok(unit())
}

fun verify_timestamp(
    package_timestamp: u64,
    config: &Config,
    current_timestamp: u64,
): Result<Unit> {
    if (package_timestamp + config.max_timestamp_delay_ms() < current_timestamp) {
        return error(b"Timestamp too old")
    };

    if (package_timestamp > current_timestamp + config.max_timestamp_ahead_ms()) {
        return error(b"Timestamp too future")
    };

    ok(unit())
}

fun verify_signer_count(
    data_packages: &vector<DataPackage>,
    threshold: u8,
    signers: &vector<vector<u8>>,
): Result<Unit> {
    let mut valid_signer_count = 0;
    let mut remaining_signers = vec_set::from_keys(*signers);
    let mut i = 0;

    while (i < data_packages.length()) {
        let signer_address = data_packages[i].signer_address();

        if (!remaining_signers.contains(signer_address)) {
            return error(b"Unknown or duplicated signer")
        };

        remaining_signers.remove(signer_address);
        valid_signer_count = valid_signer_count + 1;
        i = i + 1;
    };

    if (valid_signer_count < (threshold as u64)) {
        return error(b"Insufficient signer count")
    };

    ok(unit())
}

// === Tests Functions ===

#[test_only]
use redstone_price_adapter::redstone_sdk_config::test_config;
#[test_only]
use redstone_price_adapter::redstone_sdk_data_package::new_data_package;

#[test]
fun test_verify_timestamps_are_the_same() {
    let data_packages = vector::tabulate!(10, |_| {
        new_data_package(x"", 10, vector[])
    });

    verify_timestamps_are_the_same(&data_packages).unwrap();
}

#[test]
fun test_verify_timestamps_are_the_same_different_timestamps() {
    let data_packages = vector::tabulate!(10, |i| {
        new_data_package(x"", i, vector[])
    });

    verify_timestamps_are_the_same(&data_packages).unwrap_err();
}

#[test]
fun test_verify_timestamps_are_the_same_empty() {
    verify_timestamps_are_the_same(&vector[]).unwrap_err();
}

#[test]
fun test_verify_timestamp() {
    let config = test_config();
    let current = 1_000;

    vector[0, 10, 200, 500].do!(|i| {
        verify_timestamp(current - i, &config, current).unwrap();
        verify_timestamp(current + i, &config, current).unwrap();
    });
}

#[test]
fun test_verify_timestamp_too_future() {
    let config = test_config();

    verify_timestamp(1000 + config.max_timestamp_ahead_ms() + 1, &config, 1000).unwrap_err();
}

#[test]
fun test_verify_timestamp_too_old() {
    let config = test_config();
    let value = 1_000_000;

    verify_timestamp(value - config.max_timestamp_delay_ms() - 1, &config, value).unwrap_err();
}

#[test]
fun test_verify_signer_count() {
    let data_packages = vector[
        new_data_package(x"00", 10, vector[]),
        new_data_package(x"01", 10, vector[]),
        new_data_package(x"02", 10, vector[]),
        new_data_package(x"03", 10, vector[]),
        new_data_package(x"04", 10, vector[]),
    ];

    let signers = vector[x"00", x"01", x"02", x"03", x"04"];

    5_u64.do_eq!(
        |threshold| verify_signer_count(&data_packages, threshold as u8, &signers).unwrap(),
    );
}

#[test]
fun test_verify_signer_count_success() {
    let data_packages = vector[
        new_data_package(x"00", 10, vector[]),
        new_data_package(x"01", 10, vector[]),
    ];

    let signers = vector[x"00", x"01"];

    2_u64.do_eq!(
        |threshold| verify_signer_count(&data_packages, threshold as u8, &signers).unwrap(),
    );
}

#[test]
fun test_verify_signer_count_fail() {
    let data_packages = vector[
        new_data_package(x"00", 10, vector[]),
        new_data_package(x"01", 10, vector[]),
        new_data_package(x"02", 10, vector[]),
        new_data_package(x"03", 10, vector[]),
        new_data_package(x"04", 10, vector[]),
    ];

    let signers = vector[x"00", x"01", x"02", x"03", x"04", x"05"];

    verify_signer_count(&data_packages, 6, &signers).unwrap_err();
}

#[test]
fun test_verify_signer_count_unknow_signers() {
    let data_packages = vector[
        new_data_package(x"00", 10, vector[]),
        new_data_package(x"01", 10, vector[]),
        new_data_package(x"02", 10, vector[]),
        new_data_package(x"03", 10, vector[]),
        new_data_package(x"04", 10, vector[]),
    ];

    let signers = vector[x"11", x"12", x"13", x"14"];

    verify_signer_count(&data_packages, 3, &signers).unwrap_err();
}

#[test]
fun test_verify_redstone_marker_bad_last_byte() {
    verify_redstone_marker(&x"000002ed57011e0001").unwrap_err();
}

#[test]
fun test_verify_redstone_marker_bad_first_byte() {
    verify_redstone_marker(&x"100002ed57011e0000").unwrap_err();
}

#[test]
fun test_verify_redstone_marker_bad_marker() {
    verify_redstone_marker(&vector::tabulate!(9, |i| i as u8)).unwrap_err();
}

#[test]
fun test_verify_redstone_marker() {
    let correct_marker = REDSTONE_MARKER;

    verify_redstone_marker(&correct_marker).unwrap();
}

#[test]
fun test_verify_data_packages_fail_on_duplicated_packages() {
    let config = test_config();
    let timestamp = 1000;

    let data_packages = vector[
        new_data_package(config.signers()[0], timestamp, vector[]),
        new_data_package(config.signers()[0], timestamp, vector[]),
        new_data_package(config.signers()[1], timestamp, vector[]),
        new_data_package(config.signers()[1], timestamp, vector[]),
        new_data_package(config.signers()[1], timestamp, vector[]),
    ];

    verify_data_packages(&data_packages, &config, 1000).unwrap_err();
}

#[test]
fun test_verify_data_packages() {
    let config = test_config();
    let timestamp = 1000;

    let data_packages = vector[
        new_data_package(config.signers()[0], timestamp, vector[]),
        new_data_package(config.signers()[1], timestamp, vector[]),
    ];

    verify_data_packages(&data_packages, &config, 1000).unwrap();
}

#[test]
fun test_verify_data_packages_fail_on_duplicated_packages_after_threshold_met() {
    let config = test_config();
    let timestamp = 1000;

    let data_packages = vector[
        new_data_package(config.signers()[0], timestamp, vector[]),
        new_data_package(config.signers()[1], timestamp, vector[]),
        new_data_package(config.signers()[1], timestamp, vector[]),
    ];

    verify_data_packages(&data_packages, &config, 1000).unwrap_err();
}
