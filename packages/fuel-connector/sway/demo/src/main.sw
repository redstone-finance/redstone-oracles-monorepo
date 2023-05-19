script;

use std::{
    block::timestamp,
    bytes::Bytes,
    logging::log,
    tx::{
        tx_script_data_length,
        tx_script_data_start_pointer,
    },
    u256::U256,
};

use redstone::{config::Config, processor::process_input};

const AVAX = U256::from((0, 0, 0, 0x41564158));
const BTC = U256::from((0, 0, 0, 0x425443));
const ETH = U256::from((0, 0, 0, 0x455448));

fn main() {
    let mut feed_ids: Vec<U256> = Vec::with_capacity(3);
    feed_ids.push(AVAX);
    feed_ids.push(BTC);
    feed_ids.push(ETH);

    let mut signers: Vec<b256> = Vec::with_capacity(6);
    signers.push(0x00000000000000000000000012470f7aba85c8b81d63137dd5925d6ee114952b);
    signers.push(0x000000000000000000000000109B4a318A4F5ddcbCA6349B45f881B4137deaFB);
    signers.push(0x0000000000000000000000001ea62d73edf8ac05dfcea1a34b9796e937a29eff);
    signers.push(0x0000000000000000000000002c59617248994D12816EE1Fa77CE0a64eEB456BF);
    signers.push(0x00000000000000000000000083cba8c619fb629b81a65c2e67fe15cf3e3c9747);
    signers.push(0x000000000000000000000000f786a909d559f5dee2dc6706d8e5a81728a39ae9);

    let config = Config {
        feed_ids,
        signers,
        signer_count_threshold: 1,
        block_timestamp: timestamp() - (10 + (1 << 62)),
    };

    let (aggregated_values, _) = process_input(tx_data_bytes(), config);

    let mut i = 0;
    while (i < aggregated_values.len) {
        log(aggregated_values.get(i).unwrap());
        i += 1;
    }
}

pub fn tx_data_bytes() -> Bytes {
    let input_length = tx_script_data_length();
    let mut bytes = Bytes::with_capacity(input_length);
    bytes.len = input_length;
    tx_script_data_start_pointer().copy_bytes_to(bytes.buf.ptr, input_length);

    return bytes;
}
