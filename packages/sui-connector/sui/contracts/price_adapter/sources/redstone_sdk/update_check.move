// === Imports ===

module redstone_price_adapter::redstone_sdk_update_check;

use redstone_price_adapter::redstone_sdk_config::Config;
use redstone_price_adapter::result::{ok, Result, error};
use redstone_price_adapter::unit::{unit, Unit};

// === Public-Package Functions ===

public(package) fun is_update_time_sound(
    config: &Config,
    last_update_timestamp_ms: u64,
    timestamp_now_ms: u64,
    sender: address,
): Result<Unit> {
    let is_trusted = sender_in_trusted(config, sender);

    let earliest_valid_update_time_ms = if (is_trusted) {
        last_update_timestamp_ms + 1
    } else {
        last_update_timestamp_ms + config.min_interval_between_updates_ms() + 1
    };

    if (timestamp_now_ms < earliest_valid_update_time_ms) {
        return error(b"Bad update time")
    };

    ok(unit())
}

// === Private Functions ===

fun sender_in_trusted(config: &Config, sender: address): bool {
    config.trusted_updaters().any!(|trusted| trusted == sender)
}
