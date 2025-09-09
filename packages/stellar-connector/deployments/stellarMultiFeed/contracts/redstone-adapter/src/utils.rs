use redstone::FeedId;
use soroban_sdk::{Env, String};

pub fn feed_to_string(env: &Env, feed: FeedId) -> String {
    let feed_bytes = feed.to_array();

    let non_zero = feed_bytes.split(|byte| *byte == 0).next().unwrap();

    String::from_bytes(env, non_zero)
}
