use redstone::{FeedId, TimestampMillis};
use soroban_sdk::{Env, String};

const MS_IN_SEC: u64 = 1_000;

pub fn feed_to_string(env: &Env, feed: FeedId) -> String {
    let feed_bytes = feed.to_array();

    let non_zero = feed_bytes.split(|byte| *byte == 0).next().unwrap();

    String::from_bytes(env, non_zero)
}

pub fn now(env: &Env) -> TimestampMillis {
    TimestampMillis::from_millis(env.ledger().timestamp() * MS_IN_SEC)
}
