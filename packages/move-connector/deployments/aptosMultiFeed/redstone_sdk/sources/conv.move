module redstone_sdk::conv {
    // === Imports ===

    use std::vector;

    // === Errors ===

    const E_OVERFLOW: u64 = 0;

    // === Constants ===

    const HEX_BASE_SHIFT_BY: u8 = 8;

    // === Public Functions ===

    public fun from_bytes_to_u256(bytes: &vector<u8>): u256 {
        let result = 0;
        let len = vector::length(bytes);
        assert!(len <= 32, E_OVERFLOW);

        for (i in 0..len) {
            let byte = *vector::borrow(bytes, i);
            result = (result << HEX_BASE_SHIFT_BY) | (byte as u256);
        };

        result
    }

    public fun from_bytes_to_u64(bytes: &vector<u8>): u64 {
        let result = 0;
        let len = vector::length(bytes);
        assert!(len <= 8, E_OVERFLOW);

        for (i in 0..len) {
            let byte = *vector::borrow(bytes, i);
            result = (result << HEX_BASE_SHIFT_BY) | (byte as u64);
        };

        result
    }

    // === Test Functions ===

    #[test_only]
    fun test_u64(bytes: &vector<u8>, expected_number: u64) {
        let out = from_bytes_to_u64(bytes);
        assert!(out == expected_number, out);
    }

    #[test_only]
    fun test_u256(bytes: &vector<u8>, expected_number: u256) {
        let out = from_bytes_to_u256(bytes);
        assert!(out == expected_number, 0);
    }

    #[test]
    fun test_from_bytes_to_u64() {
        let inputs: vector<vector<u8>> = vector[
            vector[0],
            vector[1, 0],
            vector[1, 1],
            vector[0, 1, 0],
            vector[1, 1, 0],
            vector[1, 1, 1],
            vector[0, 0, 0, 0, 0],
            vector[1, 0, 0, 0, 0, 0, 0, 0],
            vector[1, 0, 0, 0, 0, 0, 0, 12],
            vector[1, 0, 0, 123, 0, 0, 0, 255]
        ];
        let expected_numbers = vector[
            0,
            256,
            256 + 1,
            256,
            256 * 256 + 256,
            256 * 256 + 256 + 1,
            0,
            256 * 256 * 256 * 256 * 256 * 256 * 256,
            256 * 256 * 256 * 256 * 256 * 256 * 256 + 12,
            256 * 256 * 256 * 256 * 256 * 256 * 256 + 123 * 256 * 256 * 256 * 256 + 255
        ];

        for (i in 0..vector::length(&inputs)) {
            test_u64(
                vector::borrow(&inputs, i),
                *vector::borrow(&expected_numbers, i)
            );
        };
    }

    #[test]
    fun test_from_bytes_to_u256() {
        let inputs: vector<vector<u8>> = vector[
            vector[0], vector[1, 0], vector[1, 1], vector[0, 1, 0], vector[1, 1, 0], vector[
            1, 1, 1], vector[0, 0, 0, 0, 0], vector[1, 0, 0, 0, 0, 0, 0, 0], vector[255, 0,
            0, 0, 0, 0, 0, 0], vector[20, 0, 0, 0, 0, 77, 0, 0], vector[1, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0], vector[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0,
            255, 123]
        ];
        let expected_numbers: vector<u256> = vector[
            0,
            256,
            256 + 1,
            256,
            256 * 256 + 256,
            256 * 256 + 256 + 1,
            0,
            256 * 256 * 256 * 256 * 256 * 256 * 256,
            255 * 256 * 256 * 256 * 256 * 256 * 256 * 256,
            20 * 256 * 256 * 256 * 256 * 256 * 256 * 256 + 77 * 256 * 256,
            256 * 256 * 256 * 256 * 256 * 256 * 256 * 256 * 256 * 256 * 256 * 256 * 256
                * 256 * 256,
            256 * 256 * 256 * 256 * 256 * 256 * 256 * 256 * 256 * 256 * 256 * 256 * 256
                * 256 * 256 + 3 * 256 * 256 * 256 * 256 * 256 + 255 * 256 + 123
        ];

        for (i in 0..vector::length(&inputs)) {
            test_u256(
                vector::borrow(&inputs, i),
                *vector::borrow(&expected_numbers, i)
            );
        };
    }
}
