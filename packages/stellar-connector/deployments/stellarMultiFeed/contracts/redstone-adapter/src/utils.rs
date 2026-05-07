use redstone::{FeedId, TimestampMillis};
use soroban_sdk::{Env, String};

const MS_IN_SEC: u64 = 1_000;

/// Converts a `FeedId` (32-byte array) to a Soroban `String` by stripping
/// leading and trailing zero bytes.
///
/// **Normalization caveat:** This function strips *all* leading and trailing
/// zero bytes, so two distinct `FeedId` values can produce the same string. For
/// example, `[0x00, 'B', 'T', 'C', 0x00, ...]` and `[0x00, 0x00, 'B', 'T', 'C',
/// 0x00, ...]` both normalize to `"BTC"`. In practice this is not a problem
/// because feed IDs arriving from the RedStone payload are always left-aligned
/// with trailing zeros and will never carry leading zeros. However, any future
/// code that deduplicates or indexes feed IDs must call this function *before*
/// comparing — comparing raw `FeedId` bytes would incorrectly treat the two
/// examples above as different feeds.
pub fn feed_to_string(env: &Env, feed: FeedId) -> String {
    let feed_bytes = feed.to_array();

    let end = feed_bytes
        .iter()
        .rposition(|&b| b != 0)
        .map_or(0, |i| i + 1);
    let start = feed_bytes[..end].iter().position(|&b| b != 0).unwrap_or(0);
    let trimmed = &feed_bytes[start..end];

    String::from_bytes(env, trimmed)
}

pub fn now(env: &Env) -> TimestampMillis {
    TimestampMillis::from_millis(env.ledger().timestamp() * MS_IN_SEC)
}

#[test]
fn test_feed_to_string_simple() {
    let env = Env::default();

    let btc_feed_id_array: [u8; 32] = [
        66, 84, 67, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0,
    ];

    let btc_feed_id = FeedId::from(btc_feed_id_array);

    let convert_btc_feed_id_to_string = feed_to_string(&env, btc_feed_id);

    let non_btc_feed_id_array: [u8; 32] = [
        66, 84, 67, 0, 67, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0,
    ];

    let non_btc_feed_id = FeedId::from(non_btc_feed_id_array);

    let convert_non_btc_feed_id_to_string = feed_to_string(&env, non_btc_feed_id);

    assert_ne!(
        convert_btc_feed_id_to_string,
        convert_non_btc_feed_id_to_string
    );
}
