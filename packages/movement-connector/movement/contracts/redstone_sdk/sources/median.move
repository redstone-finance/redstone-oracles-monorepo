module redstone_sdk::median {
    // === Imports ===

    use std::vector;

    // === Errors ===

    const E_MEDIAN_ERROR_EMPTY_VECTOR: u64 = 0;

    // === Public Functions ===

    public fun calculate_median(values: &mut vector<u256>): u256 {
        let len = vector::length(values);
        assert!(len > 0, E_MEDIAN_ERROR_EMPTY_VECTOR);

        // Optimized paths for small vectors
        if (len == 1) {
            return *vector::borrow(values, 0)
        };

        if (len == 2) {
            let a = *vector::borrow(values, 0);
            let b = *vector::borrow(values, 1);
            return a / 2 + b / 2 + (a % 2 + b % 2) / 2
        };

        if (len == 3) {
            let a = *vector::borrow(values, 0);
            let b = *vector::borrow(values, 1);
            let c = *vector::borrow(values, 2);

            // Find middle value without sorting
            if (a <= b) {
                if (b <= c) {
                    return b // a <= b <= c
                } else if (a <= c) {
                    return c // a <= c < b
                } else {
                    return a // c < a <= b
                };
            } else {
                // b < a
                if (a <= c) {
                    return a // b < a <= c
                } else if (b <= c) {
                    return c // b <= c < a
                } else {
                    return b // c < b < a
                };
            };
        };

        sort(values);

        if (len % 2 == 1) {
            return *vector::borrow(values, len / 2)
        } else {
            let mid1 = *vector::borrow(values, len / 2 - 1);
            let mid2 = *vector::borrow(values, len / 2);

            // Safe arithmetic mean calculation to avoid overflow
            return mid1 / 2 + mid2 / 2 + (mid1 % 2 + mid2 % 2) / 2
        }
    }

    /// `sort` uses insertion sort O(n^2), O(1)
    public fun sort(values: &mut vector<u256>) {
        let len = vector::length(values);
        let i = 1;
        while (i < len) {
            let key = *vector::borrow(values, i);
            let j = i;
            while (j > 0 && *vector::borrow(values, j - 1) > key) {
                vector::swap(values, j - 1, j);
                j = j - 1;
            };
            i = i + 1;
        };
    }

    // === Test Functions ===

    #[test]
    fun test_median() {
        let values = vector[1, 3, 2];
        assert!(calculate_median(&mut values) == 2, 0);

        let values = vector[1, 2, 3, 4];
        assert!(calculate_median(&mut values) == 2, 1);

        let values = vector[1];
        assert!(calculate_median(&mut values) == 1, 2);

        let values = vector[5, 2, 8, 1, 9];
        assert!(calculate_median(&mut values) == 5, 4);
    }

    #[test]
    fun test_median_with_max_values() {
        let values = vector::empty<u256>();
        let max_value =
            0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
        let i = 0;
        while (i < 100) {
            vector::push_back(&mut values, max_value);
            i = i + 1;
        };

        let result = calculate_median(&mut values);
        assert!(result == max_value, 0);
    }

    #[test]
    fun test_median_avg() {
        let values = vector::empty<u256>();
        let max_value =
            0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
        let diff = 10u256;

        vector::push_back(&mut values, max_value);
        vector::push_back(&mut values, max_value);
        vector::push_back(&mut values, max_value - diff);
        vector::push_back(&mut values, max_value - diff);

        let result = calculate_median(&mut values);
        assert!(result == max_value - (diff / 2), 0);
    }

    #[test]
    fun test_median_small_vectors() {
        let values = vector[1];
        assert!(calculate_median(&mut values) == 1, 0);

        let values = vector[1, 2];
        assert!(calculate_median(&mut values) == 1, 1);

        let values = vector[1, 2, 3];
        assert!(calculate_median(&mut values) == 2, 2);

        let values = vector[3, 1, 2];
        assert!(calculate_median(&mut values) == 2, 3);

        let values = vector[2, 3, 1];
        assert!(calculate_median(&mut values) == 2, 4);
    }

    #[test]
    fun test_median_basic() {
        let values: vector<u256> = vector[150, 100, 250, 200];
        let expected_median = 175;
        let median = calculate_median(&mut values);
        assert!(median == expected_median, (median as u64));
    }

    #[test]
    fun test_sort() {
        let values_coll: vector<vector<u256>> = vector[
            vector[5123, 123, 55, 12, 518, 123, 123, 90, 123, 123],
            vector[1, 2, 3, 4, 5, 6, 7],
            vector[7, 6, 5, 4, 3, 2, 1],
            vector[7, 1, 2, 3, 4, 5, 6],
            vector[7, 6, 2, 3, 4, 5, 1]
        ];
        let expected_coll = vector[
            vector[12, 55, 90, 123, 123, 123, 123, 123, 518, 5123],
            vector[1, 2, 3, 4, 5, 6, 7],
            vector[1, 2, 3, 4, 5, 6, 7],
            vector[1, 2, 3, 4, 5, 6, 7],
            vector[1, 2, 3, 4, 5, 6, 7]
        ];

        let len_values: u64 = vector::length(&values_coll);
        let len_expected: u64 = vector::length(&expected_coll);
        assert!(len_values == len_expected, len_values);

        let j = 0;
        while (j < len_values) {
            let values = vector::borrow_mut(&mut values_coll, j);
            let expected = vector::borrow(&expected_coll, j);
            sort(values);
            let i = 0;
            while (i < vector::length(values)) {
                assert!(
                    *vector::borrow(values, i) == *vector::borrow(expected, i),
                    i
                );
                i = i + 1;
            };
            j = j + 1;
        }
    }
}
