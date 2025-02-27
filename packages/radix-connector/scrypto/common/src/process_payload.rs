use redstone::{
    core::{config::Config, ProcessorResult},
    radix::RadixRedStoneConfig,
    Value,
};

pub fn process_payload(
    block_timestamp: u64,
    signer_count_threshold: u8,
    signers: Vec<Vec<u8>>,
    feed_ids: Vec<Vec<u8>>,
    payload: Vec<u8>,
) -> (u64, Vec<Value>) {
    let result = try_process_payload(
        block_timestamp,
        signer_count_threshold,
        signers,
        feed_ids,
        payload,
    )
    .unwrap_or_else(|err| panic!("{}", err));

    (result.timestamp.as_millis(), result.values)
}

fn try_process_payload(
    block_timestamp: u64,
    signer_count_threshold: u8,
    signers: Vec<Vec<u8>>,
    feed_ids: Vec<Vec<u8>>,
    payload: Vec<u8>,
) -> ProcessorResult {
    let config: RadixRedStoneConfig = Config::try_new(
        signer_count_threshold,
        signers.into_iter().map(|id| id.into()).collect(),
        feed_ids.into_iter().map(|id| id.into()).collect(),
        block_timestamp.into(),
        None,
        None,
    )?
    .into();

    redstone::core::process_payload(&config, payload)
}
