module redstone_sdk::update_check {
    // === Imports ===

    use std::vector;

    // === Errors ===

    const E_UPDATE_TOO_SOON: u64 = 0;

    // === Public Functions ===

    public fun assert_update_time(
        trusted_updaters: &vector<address>,
        min_interval_between_updates_ms: u64,
        last_update_timestamp_ms: u64,
        timestamp_now_ms: u64,
        sender: address
    ) {
        if (sender_in_trusted(trusted_updaters, sender)) {
            assert!(timestamp_now_ms > last_update_timestamp_ms, E_UPDATE_TOO_SOON);
        } else {
            assert!(
                last_update_timestamp_ms + min_interval_between_updates_ms
                    < timestamp_now_ms,
                E_UPDATE_TOO_SOON
            );
        };
    }

    // === Private Functions ===

    fun sender_in_trusted(
        trusted_updaters: &vector<address>, sender: address
    ): bool {
        for (i in 0..vector::length(trusted_updaters)) {
            if (sender == *vector::borrow(trusted_updaters, i))
                return true;
        };
        false
    }
}
