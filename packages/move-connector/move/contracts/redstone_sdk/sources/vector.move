module redstone_sdk::vector {
    // === Imports ===

    use std::vector;

    // === Errors ===

    const E_INSUFFICIENT_LENGTH: u64 = 0;

    // === Public Functions ===

    public fun trim_end(v: &mut vector<u8>, len: u64): vector<u8> {
        let v_len = vector::length(v);
        assert!(len <= v_len, E_INSUFFICIENT_LENGTH);

        let result = vector[];
        for (i in 0..len) {
            vector::push_back(&mut result, vector::pop_back(v));
        };

        vector::reverse(&mut result);
        result
    }

    public fun copy_last_n(v: &vector<u8>, size: u64): vector<u8> {
        let len = vector::length(v);
        assert!(len >= size, E_INSUFFICIENT_LENGTH);

        let res = vector[];
        for (i in 0..size) {
            vector::push_back(&mut res, *vector::borrow(v, len - size + i));
        };

        res
    }

    // === Test Functions ===

    #[test_only]
    const PAYLOAD: vector<u8> = x"000002ed57011e0000";

    #[test]
    fun test_trim_end() {
        let sizes_to_trim = vector[vector::length(&PAYLOAD), 0, 1, 5];
        let expected_payloads = vector[x"", PAYLOAD, x"000002ed57011e00", x"000002ed"];
        let expected_trimmeds = vector[PAYLOAD, x"", x"00", x"57011e0000"];

        let testcases_count = vector::length(&sizes_to_trim);
        assert!(testcases_count == vector::length(&expected_payloads), 101);
        assert!(testcases_count == vector::length(&expected_trimmeds), 102);

        for (i in 0..testcases_count) {
            test_trim_end_testcase(
                PAYLOAD,
                *vector::borrow(&expected_payloads, i),
                *vector::borrow(&expected_trimmeds, i),
                *vector::borrow(&sizes_to_trim, i)
            );
        };
    }

    #[test]
    #[expected_failure]
    fun test_trim_end_bigger() {
        let _ = trim_end(&mut PAYLOAD, vector::length(&PAYLOAD) + 1);
    }

    #[test]
    fun test_copy_last_n() {
        let sizes_to_copy = vector[vector::length(&PAYLOAD), 0, 1, 5];
        let expected_copies = vector[PAYLOAD, x"", x"00", x"57011e0000"];

        let testcases_count = vector::length(&sizes_to_copy);
        assert!(testcases_count == vector::length(&expected_copies), 102);

        for (i in 0..testcases_count) {
            test_copy_last_n_end_testcase(
                PAYLOAD,
                *vector::borrow(&expected_copies, i),
                *vector::borrow(&sizes_to_copy, i)
            );
        };
    }

    #[test]
    #[expected_failure]
    fun test_copy_last_n_bigger() {
        let _ = copy_last_n(&mut PAYLOAD, vector::length(&PAYLOAD) + 1);
    }

    #[test_only]
    fun test_trim_end_testcase(
        payload: vector<u8>,
        expected_payload: vector<u8>,
        expected_trimmed: vector<u8>,
        size_to_trim: u64
    ) {
        let trimmed = trim_end(&mut payload, size_to_trim);

        assert!(trimmed == expected_trimmed, 0);
        assert!(payload == expected_payload, 0);
    }

    #[test_only]
    fun test_copy_last_n_end_testcase(
        payload: vector<u8>, expected_trimmed: vector<u8>, size_to_copy: u64
    ) {
        let trimmed = copy_last_n(&mut payload, size_to_copy);

        assert!(trimmed == expected_trimmed, 0);
        assert!(payload == PAYLOAD, 0);
    }
}
