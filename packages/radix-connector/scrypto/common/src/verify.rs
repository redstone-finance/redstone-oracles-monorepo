use redstone::{contract::verification::*, SignerAddress};

pub fn verify_signers_config(signers: &Vec<Vec<u8>>, signer_count_threshold: u8) {
    let addresses: Vec<SignerAddress> = signers
        .iter()
        .map(|signer| (signer.clone()).into())
        .collect();

    redstone::contract::verification::verify_signers_config(
        addresses.as_slice(),
        signer_count_threshold,
    )
    .unwrap_or_else(|err| panic!("{}", err));
}

pub fn verify_update(
    current_timestamp: u64,
    latest_update_timestamp: Option<u64>,
    previous_timestamp: u64,
    timestamp: u64,
) {
    UpdateTimestampVerifier::Untrusted
        .verify_timestamp(
            current_timestamp.into(),
            latest_update_timestamp.map(|v| v.into()),
            0.into(),
            previous_timestamp.into(),
            timestamp.into(),
        )
        .unwrap_or_else(|err| panic!("{}", err));
}
