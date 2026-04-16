use soroban_sdk::Error;

#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Sep40Error {
    DuplicatedFeed = 100,
    DuplicatedAsset = 101,
    FeedNotFound = 102,
}

impl From<Sep40Error> for Error {
    fn from(e: Sep40Error) -> Self {
        Error::from_contract_error(e as u32)
    }
}
