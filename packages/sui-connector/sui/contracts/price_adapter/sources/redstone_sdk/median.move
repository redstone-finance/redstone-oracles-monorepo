// === Imports ===

module redstone_price_adapter::redstone_sdk_median;

use redstone_price_adapter::constants::deprecated_code;
use redstone_price_adapter::result::{error, Result, ok};

// === Public Functions ===

public fun calculate_median(_values: &mut vector<u256>): u256 {
    abort deprecated_code()
}

public fun try_calculate_median(values: &mut vector<u256>): Result<u256> {
    let len = values.length();

    if (len == 0) {
        return error(b"Empty vector given to median")
    };

    if (len == 1) {
        return ok(values[0])
    };

    if (len == 2) {
        let a = values[0];
        let b = values[1];

        return ok(a / 2 + b / 2 + (a % 2 + b % 2) / 2)
    };

    if (len == 3) {
        let a = values[0];
        let b = values[1];
        let c = values[2];

        if (a <= b) {
            if (b <= c) {
                return ok(b)
            } else if (a <= c) {
                return ok(c)
            } else {
                return ok(a)
            }
        } else {
            if (a <= c) {
                return ok(a)
            } else if (b <= c) {
                return ok(c)
            } else {
                return ok(b)
            }
        }
    };

    sort(values);

    if (len % 2 == 1) {
        ok(values[len/2])
    } else {
        let mid1 = values[len / 2 - 1];
        let mid2 = values[len / 2];

        ok(mid1 / 2 + mid2 / 2 + (mid1 % 2 + mid2 % 2) / 2)
    }
}

/// `sort` uses insertion sort O(n^2), O(1)
public fun sort(values: &mut vector<u256>) {
    let len = values.length();
    let mut i = 1;
    while (i < len) {
        let key = values[i];
        let mut j = i;
        while (j > 0 && values[j-1] > key) {
            values.swap(j - 1, j);
            j = j - 1;
        };
        i = i + 1;
    };
}

// === Test Functions ===

#[test]
fun test_median() {
    let mut values = vector[1, 3, 2];
    assert!(try_calculate_median(&mut values).unwrap() == 2, 0);

    let mut values = vector[1, 2, 3, 4];
    assert!(try_calculate_median(&mut values).unwrap() == 2, 1);

    let mut values = vector[1];
    assert!(try_calculate_median(&mut values).unwrap() == 1, 2);

    let mut values = vector[5, 2, 8, 1, 9];
    assert!(try_calculate_median(&mut values).unwrap() == 5, 4);
}

#[test]
fun test_median_with_max_values() {
    let mut values = vector[];
    let max_value = 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
    let mut i = 0;
    while (i < 100) {
        values.push_back(max_value);
        i = i + 1;
    };

    let result = try_calculate_median(&mut values).unwrap();

    assert!(result == max_value, 0);
}

#[test]
fun test_median_avg() {
    let mut values = vector[];
    let max_value = 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
    let diff = 10u256;

    values.push_back(max_value);
    values.push_back(max_value);
    values.push_back(max_value - diff);
    values.push_back(max_value - diff);

    let result = try_calculate_median(&mut values).unwrap();

    assert!(result == max_value - (diff / 2), 0);
}

#[test]
fun test_median_small_vectors() {
    let mut values = vector[1];
    assert!(try_calculate_median(&mut values).unwrap() == 1, 0);

    let mut values = vector[1, 2];
    assert!(try_calculate_median(&mut values).unwrap() == 1, 1);

    let mut values = vector[1, 2, 3];
    assert!(try_calculate_median(&mut values).unwrap() == 2, 2);

    let mut values = vector[3, 1, 2];
    assert!(try_calculate_median(&mut values).unwrap() == 2, 3);

    let mut values = vector[2, 3, 1];
    assert!(try_calculate_median(&mut values).unwrap() == 2, 4);
}

#[test]
fun test_median_basic() {
    let mut items: vector<u256> = vector[150, 100, 250, 200];
    let expected_median = 175;
    let median = try_calculate_median(&mut items).unwrap();

    assert!(median == expected_median);
}

#[test]
fun test_sort() {
    let mut items: vector<vector<u256>> = vector[
        vector[5123, 123, 55, 12, 518, 123, 123, 90, 123, 123],
        vector[1, 2, 3, 4, 5, 6, 7],
        vector[7, 6, 5, 4, 3, 2, 1],
        vector[7, 1, 2, 3, 4, 5, 6],
        vector[7, 6, 2, 3, 4, 5, 1],
    ];
    let expected = vector[
        vector[12, 55, 90, 123, 123, 123, 123, 123, 518, 5123],
        vector[1, 2, 3, 4, 5, 6, 7],
        vector[1, 2, 3, 4, 5, 6, 7],
        vector[1, 2, 3, 4, 5, 6, 7],
        vector[1, 2, 3, 4, 5, 6, 7],
    ];
    assert!(items.length() == expected.length());

    let mut i = 0;
    while (i < expected.length()) {
        sort(&mut items[i]);
        assert!(items[i] == expected[i], i);
        i = i + 1;
    }
}
