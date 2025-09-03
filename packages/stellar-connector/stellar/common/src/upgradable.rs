use soroban_sdk::{BytesN, Env, Error};

use crate::ownable::Ownable;

pub type WasmHash = BytesN<32>;

pub trait Upgradable: Ownable {
    fn _upgrade(env: &Env, new_wasm_hash: WasmHash) -> Result<(), Error> {
        Self::_assert_owner(env)?;

        env.deployer().update_current_contract_wasm(new_wasm_hash);

        Ok(())
    }
}
