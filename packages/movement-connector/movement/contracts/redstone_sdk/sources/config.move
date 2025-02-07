module redstone_sdk::config {
    // === Imports ===

    use std::vector;

    // === Errors ===

    const E_INVALID_SIGNER_COUNT_THRESHOLD: u64 = 0;
    const E_SIGNER_COUNT_THRESHOLD_CANT_BE_ZERO: u64 = 1;
    const E_SIGNERS_ARE_NOT_UNIQUE: u64 = 2;

    // === Structs ===

    struct Config has copy, drop, store {
        signer_count_threshold: u8,
        signers: vector<vector<u8>>,
        max_timestamp_delay_ms: u64,
        max_timestamp_ahead_ms: u64,
        trusted_updaters: vector<address>,
        min_interval_between_updates_ms: u64
    }

    // === Public Functions ===

    public fun new(
        signer_count_threshold: u8,
        signers: vector<vector<u8>>,
        max_timestamp_delay_ms: u64,
        max_timestamp_ahead_ms: u64,
        trusted_updaters: vector<address>,
        min_interval_between_updates_ms: u64
    ): Config {
        let config = Config {
            signer_count_threshold,
            signers,
            max_timestamp_delay_ms,
            max_timestamp_ahead_ms,
            trusted_updaters,
            min_interval_between_updates_ms
        };

        check(&config);

        config
    }

    public fun signer_count_threshold(config: &Config): u8 {
        config.signer_count_threshold
    }

    public fun signers(config: &Config): vector<vector<u8>> {
        config.signers
    }

    public fun max_timestamp_delay_ms(config: &Config): u64 {
        config.max_timestamp_delay_ms
    }

    public fun max_timestamp_ahead_ms(config: &Config): u64 {
        config.max_timestamp_ahead_ms
    }

    public fun trusted_updaters(config: &Config): vector<address> {
        config.trusted_updaters
    }

    public fun min_interval_between_updates_ms(config: &Config): u64 {
        config.min_interval_between_updates_ms
    }

    // === Private Functions ===
    fun check(config: &Config) {
        let signer_count = vector::length(&config.signers);
        for (i in 0..(signer_count - 1)) {
            let signer_i = *vector::borrow(&config.signers, i);
            for (j in (i + 1)..signer_count) {
                let signer_j = *vector::borrow(&config.signers, j);
                assert!(signer_i != signer_j, E_SIGNERS_ARE_NOT_UNIQUE);
            };
        };

        assert!(
            signer_count >= (config.signer_count_threshold as u64),
            E_INVALID_SIGNER_COUNT_THRESHOLD
        );
        assert!(config.signer_count_threshold > 0, E_SIGNER_COUNT_THRESHOLD_CANT_BE_ZERO);
    }

    // === Tests Functions ===

    #[test_only]
    public fun test_config(): Config {
        new(
            2,
            vector[
                x"1ea62d73edF8ac05dfcea1a34b9796e937a29eFF",
                x"109b4a318a4f5ddcbca6349b45f881b4137deafb",
                x"83cba8c619fb629b81a65c2e67fe15cf3e3c9747",
                x"2c59617248994d12816ee1fa77ce0a64eeb456bf",
                x"12470f7aba85c8b81d63137dd5925d6ee114952b"
            ],
            15 * 60 * 1000,
            3 * 60 * 1000,
            vector[],
            0
        )
    }

    #[test]
    #[expected_failure(abort_code = E_SIGNER_COUNT_THRESHOLD_CANT_BE_ZERO)]
    fun cant_construct_config_with_threshold_eq_to_0() {
        let config = Config {
            signer_count_threshold: 0,
            signers: vector[
                x"1ea62d73edF8ac05dfcea1a34b9796e937a29eFF",
                x"109b4a318a4f5ddcbca6349b45f881b4137deafb"
            ],
            max_timestamp_delay_ms: 15 * 60 * 1000,
            max_timestamp_ahead_ms: 3 * 60 * 1000,
            trusted_updaters: vector[],
            min_interval_between_updates_ms: 0
        };

        check(&config);
    }

    #[test]
    #[expected_failure(abort_code = E_INVALID_SIGNER_COUNT_THRESHOLD)]
    fun cant_construct_config_with_threshold_gt_signers_len() {
        let config = Config {
            signer_count_threshold: 3,
            signers: vector[
                x"1ea62d73edF8ac05dfcea1a34b9796e937a29eFF",
                x"109b4a318a4f5ddcbca6349b45f881b4137deafb"
            ],
            max_timestamp_delay_ms: 15 * 60 * 1000,
            max_timestamp_ahead_ms: 3 * 60 * 1000,
            trusted_updaters: vector[],
            min_interval_between_updates_ms: 0
        };

        check(&config);
    }
}
