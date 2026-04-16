#![no_std]

use soroban_sdk::{contract, contractimpl, vec, Address, Env, Symbol, Val, Vec};

#[contract]
pub struct Router;

#[contractimpl]
impl Router {
    pub fn exec(
        e: Env,
        caller: Address,
        invocations: Vec<(Address, Symbol, Vec<Val>)>,
    ) -> Vec<Val> {
        // This require_auth is here so we don't get the error "[recording authorization
        // only] encountered authorization not tied to the root contract
        // invocation for an address. Use `require_auth()` in the top invocation
        // or enable non-root authorization."
        caller.require_auth();
        e.storage().instance().extend_ttl(17280, 17280 * 7);
        let mut results: Vec<Val> = vec![&e];
        for (contract, method, args) in invocations {
            results.push_back(e.invoke_contract::<Val>(&contract, &method, args));
        }
        results
    }
}
