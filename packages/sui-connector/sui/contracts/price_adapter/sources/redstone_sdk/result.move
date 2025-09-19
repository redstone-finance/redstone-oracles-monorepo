module redstone_price_adapter::result;

use std::string::{String, utf8};

const E_RESULT_IS_ERROR: u64 = 0;
const E_RESULT_IS_OK: u64 = 1;

public struct Result<Element> has copy, drop, store {
    is_ok: bool,
    ok: Option<Element>,
    error: Option<String>,
}

public fun ok<T>(element: T): Result<T> {
    Result {
        is_ok: true,
        ok: option::some(element),
        error: option::none(),
    }
}

public fun error<T>(error: vector<u8>): Result<T> {
    Result {
        is_ok: false,
        ok: option::none(),
        error: option::some(utf8(error)),
    }
}

public fun is_ok<T>(result: &Result<T>): bool {
    result.is_ok
}

public fun unwrap<T>(result: Result<T>): T {
    let Result { is_ok, ok, .. } = result;

    assert!(is_ok, E_RESULT_IS_ERROR);

    ok.destroy_some()
}

public fun unwrap_err<T>(result: Result<T>): String {
    let Result { is_ok, error, ok } = result;

    assert!(!is_ok, E_RESULT_IS_OK);

    ok.destroy_none();
    error.destroy_some()
}

public fun borrow<T>(result: &Result<T>): &T {
    assert!(result.is_ok, E_RESULT_IS_ERROR);

    result.ok.borrow()
}

public fun borrow_err<T>(result: &Result<T>): &String {
    assert!(!result.is_ok, E_RESULT_IS_OK);

    result.error.borrow()
}

public macro fun map<$T, $U>($r: Result<$T>, $f: |$T| -> $U): Result<$U> {
    let r = $r;
    if (r.is_ok()) {
        ok($f(r.unwrap()))
    } else {
        error(r.unwrap_err().into_bytes())
    }
}

public macro fun map_both<$T, $U, $P>(
    $r1: Result<$T>,
    $r2: Result<$P>,
    $f: |$T, $P| -> $U,
): Result<$U> {
    let r1 = $r1;
    let r2 = $r2;

    if (r1.is_ok() && r2.is_ok()) {
        ok($f(r1.unwrap(), r2.unwrap()))
    } else if (!r1.is_ok()) {
        error(r1.unwrap_err().into_bytes())
    } else {
        error(r2.unwrap_err().into_bytes())
    }
}

public macro fun flat_map<$T, $U>($r: Result<$T>, $f: |$T| -> Result<$U>): Result<$U> {
    let r = $r;

    if (r.is_ok()) {
        $f(r.unwrap())
    } else {
        error(r.unwrap_err().into_bytes())
    }
}

public macro fun map_ref<$T, $U>($r: Result<$T>, $f: |&$T| -> $U): Result<$U> {
    let r = $r;
    if (r.is_ok()) {
        ok($f(r.borrow()))
    } else {
        error(r.unwrap_err().into_bytes())
    }
}

public macro fun peek_err<$T>($r: Result<$T>, $f: |&String|): Result<$T> {
    let r = $r;

    if (!r.is_ok()) {
        $f(r.borrow_err());
    };

    r
}

#[test]
fun test_map() {
    let p = ok(10);

    let x = p.map!(|x| x + 10);

    assert!(x.unwrap() == 20);
    assert!(p.unwrap() == 10);
}

#[test]
fun test_map_ref() {
    let p = ok(10);

    let x = p.map_ref!(|x| *x + 10);

    assert!(x.unwrap() == 20);
    assert!(p.unwrap() == 10);
}

#[test]
#[expected_failure(abort_code = E_RESULT_IS_OK)]
fun test_unwrap() {
    let p = ok(10);

    p.unwrap_err();
}

#[test]
fun test_flat_map_ok_to_ok() {
    let p = ok(10);

    let result = p.flat_map!(|x| {
        if (x > 5) {
            ok(x * 2)
        } else {
            error(b"too small")
        }
    });

    assert!(result.is_ok());
    assert!(result.unwrap() == 20);
}

#[test]
fun test_flat_map_ok_to_error() {
    let p = ok(3);

    let result = p.flat_map!(|x| {
        if (x > 5) {
            ok(x * 2)
        } else {
            error(b"too small")
        }
    });

    assert!(!result.is_ok());
    assert!(result.unwrap_err() == utf8(b"too small"));
}

#[test]
fun test_flat_map_error_propagation() {
    let p: Result<u64> = error(b"original error");

    let result = p.flat_map!(|x| {
        ok(x * 2)
    });

    assert!(!result.is_ok());
    assert!(result.unwrap_err() == utf8(b"original error"));
}

#[test]
fun test_flat_map_chaining() {
    let p = ok(10);

    let result = p.flat_map!(|x| ok(x + 5)).flat_map!(|x| ok(x * 2)).flat_map!(|x| {
        if (x > 20) {
            ok(x - 5)
        } else {
            error(b"chain failed")
        }
    });

    assert!(result.is_ok());
    assert!(result.unwrap() == 25);
}

#[test]
fun test_flat_map_chaining_with_failure() {
    let p = ok(5);

    let result = p.flat_map!(|x| ok(x + 2)).flat_map!(|x| {
        if (x > 10) {
            ok(x * 2)
        } else {
            error(b"intermediate failure")
        }
    }).flat_map!(|x| ok(x + 100));

    assert!(!result.is_ok());
    assert!(result.unwrap_err() == utf8(b"intermediate failure"));
}

#[test]
fun test_flat_map_parse_and_validate() {
    let input = ok(42u64);

    let result = input.flat_map!(|num| {
        if (num >= 18 && num <= 100) {
            ok(num)
        } else {
            error(b"age out of valid range")
        }
    }).flat_map!(|valid_age| {
        if (valid_age < 30) {
            ok(100)
        } else {
            ok(200)
        }
    });

    assert!(result.is_ok());
    assert!(result.unwrap() == 200);
}

#[test]
fun test_flat_map_different_types() {
    let number_result = ok(123u64);

    let string_result = number_result.flat_map!(|num| {
        if (num > 100) {
            ok(utf8(b"big number"))
        } else {
            error(b"number too small")
        }
    });

    assert!(string_result.is_ok());
    assert!(string_result.unwrap() == utf8(b"big number"));
}
