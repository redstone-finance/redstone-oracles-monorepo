module redstone_price_adapter::price_adapter {
    // === Imports ===
    use std::string::String;
    use std::table::{Self, Table};
    use std::transaction_context;
    use std::transaction_context::AUID;
    use std::transaction_context::generate_auid;
    use std::option::{Self, Option};
    use std::event::emit;
    use std::signer;
    use std::vector;

    use aptos_framework::object::{Self, ObjectCore};
    use aptos_framework::timestamp;

    use redstone_sdk::config::{new as new_config, Config};
    use redstone_sdk::payload::process_payload;
    use redstone_price_adapter::price_data::{
        price_and_timestamp as price_data_price_and_timestamp,
        price as price_data_price,
        timestamp as price_data_timestamp,
        default,
        update,
        write_timestamp,
        PriceData
    };
    use redstone_sdk::update_check::assert_update_time;
    use redstone_sdk::conv::from_bytes_to_u256;
    use redstone_sdk::feed::{Self, Feed};

    // === Constants ===

    const TRUSTED_UPDATERS: vector<address> = vector[
        @0x854e583484be0872838778f8754da6beae1de83544f3815c35cb482876eabaa1
    ];
    const SIGNER_COUNT_THRESHOLD: u8 = 3;
    const ALLOWED_SIGNERS: vector<vector<u8>> = vector[
        x"8BB8F32Df04c8b654987DAaeD53D6B6091e3B774",
        x"dEB22f54738d54976C4c0fe5ce6d408E40d88499",
        x"51Ce04Be4b3E32572C4Ec9135221d0691Ba7d202",
        x"DD682daEC5A90dD295d14DA4b0bec9281017b5bE",
        x"9c5AE89C4Af6aA32cE58588DBaF90d18a855B6de"
    ];
    const MAX_TIMESTAMP_DELAY_MS: u64 = 60 * 1000; // 60 seconds
    const MAX_TIMESTAMP_AHEAD_MS: u64 = 60 * 1000; // 60 seconds
    const MIN_INTERVAL_BETWEEN_UPDATES: u64 = 40 * 1000; // 40 seconds

    const NAME: vector<u8> = b"RedStonePriceAdapter";

    // === Errors ===
    const E_UNEXPECTED_RESULT_COUNT: u64 = 0;
    const E_DATA_TOO_OLD: u64 = 1;
    const E_INVALID_FEED_ID: u64 = 2;

    // === Structs ===

    struct PriceAdapter has key {
        id: AUID,
        prices: Table<u256, PriceData>
    }

    #[event]
    struct PriceWrite has copy, drop, store {
        feed_id: String,
        value: u256,
        timestamp: u64,
        write_timestamp: u64
    }

    // === Public-Friend Functions ===

    friend redstone_price_adapter::main;

    public(friend) fun new(caller: &signer) {
        let caller_address = signer::address_of(caller);
        let constructor_ref = object::create_named_object(caller, NAME);
        let object_signer = object::generate_signer(&constructor_ref);

        move_to(
            &object_signer,
            PriceAdapter {
                id: generate_auid(),
                prices: table::new()
            }
        );

        let object = object::object_from_constructor_ref<ObjectCore>(&constructor_ref);

        object::transfer(caller, object, caller_address);
    }

    // === Entry-Mutative Functions ===

    public entry fun write_price(
        price_adapter_address: address, feed_id: vector<u8>, payload: vector<u8>
    ) acquires PriceAdapter {
        let price_adapter = borrow_global_mut<PriceAdapter>(price_adapter_address);

        write_new_prices(price_adapter, &vector[feed_id], payload);
    }

    public entry fun write_prices(
        price_adapter_address: address, feed_ids: vector<vector<u8>>, payload: vector<u8>
    ) acquires PriceAdapter {
        let price_adapter = borrow_global_mut<PriceAdapter>(price_adapter_address);

        write_new_prices(price_adapter, &feed_ids, payload);
    }

    // === Private Functions ===

    fun write_new_prices(
        price_adapter: &mut PriceAdapter,
        feed_ids: &vector<vector<u8>>,
        payload: vector<u8>
    ) {
        let timestamp_now_ms = timestamp::now_microseconds() / 1000;
        let (aggregated_values, timestamp) =
            process_payload_for_feed_ids(timestamp_now_ms, feed_ids, payload);
        let sender = transaction_context::sender();

        let feed_ids_len = vector::length(feed_ids);
        for (i in 0..feed_ids_len) {
            let feed_id = vector::borrow(feed_ids, i);
            let feed = feed::new(*feed_id);
            let price_write_timestamp =
                get_price_feed_write_timestamp(price_adapter, &mut feed);

            option::for_each(
                price_write_timestamp,
                |write_timestamp| {
                    assert_update_time(
                        &TRUSTED_UPDATERS,
                        MIN_INTERVAL_BETWEEN_UPDATES,
                        write_timestamp,
                        timestamp_now_ms,
                        sender
                    );
                }
            );

            let aggregated_value = vector::borrow(&aggregated_values, i);

            overwrite_price(
                price_adapter,
                &mut feed,
                *aggregated_value,
                timestamp,
                timestamp_now_ms
            );
        }
    }

    fun process_payload_for_feed_ids(
        timestamp_now_ms: u64, feed_ids: &vector<vector<u8>>, payload: vector<u8>
    ): (vector<u256>, u64) {
        let config: Config =
            new_config(
                SIGNER_COUNT_THRESHOLD,
                ALLOWED_SIGNERS,
                MAX_TIMESTAMP_DELAY_MS,
                MAX_TIMESTAMP_AHEAD_MS
            );

        let (aggregated_values, timestamp) =
            process_payload(&config, timestamp_now_ms, feed_ids, payload);
        assert!(
            vector::length(&aggregated_values) == vector::length(feed_ids),
            E_UNEXPECTED_RESULT_COUNT
        );

        (aggregated_values, timestamp)
    }

    fun get_or_create_default(
        price_adapter: &mut PriceAdapter, feed: &mut Feed
    ): &mut PriceData {
        let key = feed::key(feed);

        if (!table::contains(&price_adapter.prices, key)) {
            let feed_id = *feed::feed_id(feed);
            let new_price_data = default(feed_id);
            table::add(&mut price_adapter.prices, key, new_price_data);
        };

        table::borrow_mut(&mut price_adapter.prices, key)
    }

    fun get_price_feed_write_timestamp(
        price_adapter: &PriceAdapter, feed: &mut Feed
    ): Option<u64> {
        let key = feed::key(feed);
        if (!table::contains(&price_adapter.prices, key)) {
            return option::none()
        };

        option::some(write_timestamp(table::borrow(&price_adapter.prices, key)))
    }

    fun overwrite_price(
        price_adapter: &mut PriceAdapter,
        feed: &mut Feed,
        aggregated_value: u256,
        timestamp: u64,
        write_timestamp: u64
    ) {
        let feed_id = *feed::feed_id(feed);
        let price_data = get_or_create_default(price_adapter, feed);

        assert!(timestamp > price_data_timestamp(price_data), E_DATA_TOO_OLD);
        update(
            price_data,
            feed_id,
            aggregated_value,
            timestamp,
            write_timestamp
        );

        // emits event PriceWrite
        emit(
            PriceWrite {
                feed_id: std::string::utf8(feed_id),
                value: aggregated_value,
                timestamp,
                write_timestamp
            }
        );
    }

    fun price_data(price_adapter: &PriceAdapter, feed_id: vector<u8>): &PriceData {
        let key = from_bytes_to_u256(&feed_id);
        if (!table::contains(&price_adapter.prices, key)) {
            abort E_INVALID_FEED_ID
        };

        table::borrow(&price_adapter.prices, key)
    }

    // === Public-View Functions ===

    #[view]
    public fun price_and_timestamp_by_address(
        price_adapter_address: address, feed_id: vector<u8>
    ): (u256, u64) acquires PriceAdapter {
        let price_adapter = borrow_global<PriceAdapter>(price_adapter_address);
        let price_data = price_data(price_adapter, feed_id);

        price_data_price_and_timestamp(price_data)
    }

    #[view]
    public fun price_by_address(
        price_adapter_address: address, feed_id: vector<u8>
    ): u256 acquires PriceAdapter {
        let price_adapter = borrow_global<PriceAdapter>(price_adapter_address);
        let price_data = price_data(price_adapter, feed_id);

        price_data_price(price_data)
    }

    #[view]
    public fun timestamp_by_address(
        price_adapter_address: address, feed_id: vector<u8>
    ): u64 acquires PriceAdapter {
        let price_adapter = borrow_global<PriceAdapter>(price_adapter_address);
        let price_data = price_data(price_adapter, feed_id);

        price_data_timestamp(price_data)
    }

    #[view]
    public fun price_data_by_address(
        price_adapter_address: address, feed_id: vector<u8>
    ): PriceData acquires PriceAdapter {
        let price_adapter = borrow_global<PriceAdapter>(price_adapter_address);

        *price_data(price_adapter, feed_id)
    }

    #[view]
    public fun signer_count_threshold(): u8 {
        SIGNER_COUNT_THRESHOLD
    }
}
