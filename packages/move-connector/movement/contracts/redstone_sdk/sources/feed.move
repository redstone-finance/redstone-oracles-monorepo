module redstone_sdk::feed {
    // === Imports ===

    use std::option::{Self, Option};
    use redstone_sdk::conv::from_bytes_to_u256;

    // === Structs ===

    struct Feed has drop {
        feed_id: vector<u8>,
        key: Option<u256>
    }

    // === Public Functions ===

    public fun new(feed_id: vector<u8>): Feed {
        Feed { feed_id, key: option::none() }
    }

    public fun feed_id(feed: &Feed): &vector<u8> {
        &feed.feed_id
    }

    // === Public-Mutative Functions ===

    public fun key(feed: &mut Feed): u256 {
        if (option::is_none(&feed.key)) {
            let key = from_bytes_to_u256(&feed.feed_id);
            option::fill(&mut feed.key, key);
        };

        *option::borrow(&feed.key)
    }
}
