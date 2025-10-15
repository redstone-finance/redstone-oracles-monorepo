use soroban_sdk::{
    xdr::{ScErrorCode, ScErrorType},
    Address, Env, Error,
};

use crate::MISSING_STORAGE_ENTRY;

const OWNER_KEY: &&str = &"owner";
const PENDING_OWNER_KEY: &&str = &"pending-owner";

pub trait Ownable {
    fn _set_owner(env: &Env, owner: Address) -> Result<(), Error> {
        if env.storage().instance().has(OWNER_KEY) {
            return Err(Error::from_type_and_code(
                ScErrorType::Storage,
                ScErrorCode::ExistingValue,
            ));
        }

        env.storage().instance().set(OWNER_KEY, &owner);

        Ok(())
    }

    fn _change_owner(env: &Env, new_owner: Address) -> Result<(), Error> {
        Self::_assert_owner(env)?;

        env.storage().instance().set(PENDING_OWNER_KEY, &new_owner);

        Ok(())
    }

    fn _accept_ownership(env: &Env) -> Result<(), Error> {
        let pending = Self::_assert_pending_owner(env)?;

        env.storage().instance().set(OWNER_KEY, &pending);
        env.storage().instance().remove(PENDING_OWNER_KEY);

        Ok(())
    }

    fn _cancel_ownership_transfer(env: &Env) -> Result<(), Error> {
        Self::_assert_owner(env)?;

        env.storage().instance().remove(PENDING_OWNER_KEY);

        Ok(())
    }

    fn _assert_owner(env: &Env) -> Result<Address, Error> {
        Self::_assert_sender(env, OWNER_KEY)
    }

    fn _assert_pending_owner(env: &Env) -> Result<Address, Error> {
        Self::_assert_sender(env, PENDING_OWNER_KEY)
    }

    fn _assert_sender(env: &Env, key: &&str) -> Result<Address, Error> {
        let address: Address = env
            .storage()
            .instance()
            .get(key)
            .ok_or(MISSING_STORAGE_ENTRY)?;

        address.require_auth();

        Ok(address)
    }
}
