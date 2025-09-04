use soroban_sdk::{
    xdr::{ScErrorCode, ScErrorType},
    Address, Env, Error,
};

use crate::MISSING_STORAGE_ENTRY;

const OWNER_KEY: &&str = &"owner";

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

        env.storage().instance().set(OWNER_KEY, &new_owner);

        Ok(())
    }

    fn _assert_owner(env: &Env) -> Result<(), Error> {
        let owner: Address = env
            .storage()
            .instance()
            .get(OWNER_KEY)
            .ok_or(MISSING_STORAGE_ENTRY)?;

        owner.require_auth();

        Ok(())
    }
}
