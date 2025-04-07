#[cfg(feature = "mock-time")]
redstone_testing::test_price_adapter_multi_feed_specific_impl!(
    crate::env::test_env::PriceAdapterTestEnv,
    env,
    crate::env::sim_env::PriceAdapterSimEnv,
    sim
);
