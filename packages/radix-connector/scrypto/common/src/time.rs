use scrypto::prelude::*;

#[derive(ScryptoSbor)]
pub enum Time {
    System,
    #[cfg(feature = "mock-time")]
    Mock(u64),
}

impl Time {
    #[inline(always)]
    pub fn get_current_in_ms(&self) -> u64 {
        #[cfg(feature = "mock-time")]
        if let Time::Mock(seconds) = self {
            return *seconds * 1000;
        }
        get_current_time() * 1000
    }

    #[inline(always)]
    pub fn maybe_increase(&mut self, _seconds: u64) {
        #[cfg(feature = "mock-time")]
        if let Time::Mock(previous) = self {
            *self = Time::Mock(*previous + _seconds);
        }
    }
}

impl From<Option<u64>> for Time {
    fn from(_value: Option<u64>) -> Self {
        #[cfg(feature = "mock-time")]
        if let Some(value) = _value {
            return Self::Mock(value);
        }

        Self::System
    }
}

pub fn get_current_time() -> u64 {
    Clock::current_time_rounded_to_seconds().seconds_since_unix_epoch as u64
}
