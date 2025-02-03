module redstone_price_adapter::redstone_sdk_feed_id_key {
    // === Imports ===
    use std::option::{Self, Option};
    use redstone_price_adapter::redstone_sdk_conv::from_bytes_to_u256;

    // === Structs ===
    struct FeedIdKey has drop {
        feed_id: vector<u8>,
        feed_id_key: Option<u256>
    }

    // === Public Functions ===
    public fun new(feed_id: vector<u8>): FeedIdKey {
        FeedIdKey { feed_id, feed_id_key: option::none() }
    }

    public fun key(feed_key: &mut FeedIdKey): u256 {
        if (option::is_none(&feed_key.feed_id_key)) {
            let key = from_bytes_to_u256(&feed_key.feed_id);
            option::fill(&mut feed_key.feed_id_key, key);
        };

        *option::borrow(&feed_key.feed_id_key)
    }

    public fun feed_id(feed_key: &FeedIdKey): &vector<u8> {
        &feed_key.feed_id
    }
}
