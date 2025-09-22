// === Imports ===

module redstone_price_adapter::constants;

// === Errors ===
const E_DEPRECATED: u64 = 0;

// === Public(Package) functions ===

public(package) fun deprecated_code(): u64 {
    E_DEPRECATED
}
