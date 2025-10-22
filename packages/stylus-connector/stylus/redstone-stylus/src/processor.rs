use crate::config::Config;
use crate::crypto::AdapterWrapper;
use alloy_primitives::B256;
use redstone::core::process_payload;
use redstone::core::processor_result::ValidatedPayload;
use stylus_sdk::abi::Bytes;
use stylus_sdk::prelude::TopLevelStorage;

pub struct Processor {}

impl Processor {
    pub fn process_payload<Adapter: TopLevelStorage>(
        adapter: &mut Adapter,
        stylus_config: Config,
        feeds: &[B256],
        payload: Bytes,
        block_timestamp_millis: u64,
    ) -> Result<ValidatedPayload, redstone::network::error::Error> {
        let feeds_id = feeds
            .iter()
            .copied()
            .map(|bytes| bytes.0)
            .map(Into::into)
            .collect();

        let wrapper = &mut AdapterWrapper(adapter);
        let mut config =
            stylus_config.redstone_config(wrapper, feeds_id, block_timestamp_millis.into())?;

        let result = process_payload(&mut config, payload.to_vec())?;

        Ok(result)
    }
}
