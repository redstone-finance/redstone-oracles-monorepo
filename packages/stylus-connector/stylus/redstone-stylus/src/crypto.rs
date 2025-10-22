use alloy_primitives::B256;
use openzeppelin_stylus::utils::cryptography::ecdsa;
use redstone::{Bytes, Crypto, CryptoError, SignerAddress};
use stylus_sdk::crypto;
use stylus_sdk::prelude::TopLevelStorage;

pub struct AdapterWrapper<Adapter>(pub Adapter);

impl<Adapter: TopLevelStorage> Crypto for &mut AdapterWrapper<&mut Adapter> {
    type KeccakOutput = B256;

    fn keccak256(&mut self, input: impl AsRef<[u8]>) -> Self::KeccakOutput {
        crypto::keccak(input)
    }

    fn recover_public_key(
        &mut self,
        recovery_byte: u8,
        signature_bytes: impl AsRef<[u8]>,
        message_hash: Self::KeccakOutput,
    ) -> Result<Bytes, CryptoError> {
        let sig_bytes = signature_bytes.as_ref();

        if sig_bytes.len() != 64 {
            return Err(CryptoError::InvalidSignatureLen(sig_bytes.len()));
        }

        let mut r_bytes = [0u8; 32];
        let mut s_bytes = [0u8; 32];

        r_bytes.copy_from_slice(&sig_bytes[0..32]);
        s_bytes.copy_from_slice(&sig_bytes[32..64]);

        let r = B256::from(r_bytes);
        let s = B256::from(s_bytes);
        let hash = B256::from(message_hash);

        let recovery_byte = if recovery_byte < 27 {
            recovery_byte + 27
        } else {
            recovery_byte
        };

        let address =
            ecdsa::recover(&mut *self.0, hash, recovery_byte, r, s).map_err(|e| match e {
                ecdsa::Error::InvalidSignature(_) => CryptoError::RecoveryByte(recovery_byte),
                ecdsa::Error::InvalidSignatureS(_) => CryptoError::Signature(sig_bytes.to_vec()),
            })?;

        Ok(Bytes(address.to_vec()))
    }

    fn recover_address<A: AsRef<[u8]>, B: AsRef<[u8]>>(
        &mut self,
        message: A,
        signature: B,
    ) -> Result<SignerAddress, CryptoError> {
        let signature = signature.as_ref();
        let recovery_byte = signature[64];
        let msg_hash = self.keccak256(message);

        let key = self.recover_public_key(recovery_byte, &signature[..64], msg_hash)?;

        Ok(key.0.into())
    }
}
