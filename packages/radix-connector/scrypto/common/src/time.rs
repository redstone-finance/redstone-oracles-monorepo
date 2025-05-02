use scrypto::prelude::Clock;

pub fn get_current_time_in_ms() -> u64 {
    Clock::current_time_rounded_to_seconds().seconds_since_unix_epoch as u64 * 1_000
}
