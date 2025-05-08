# Solana Contracts — general assumptions

<!-- TOC -->
* [Solana Contracts — general assumptions](#solana-contracts--general-assumptions)
  * [PriceAdapter](#priceadapter)
<!-- TOC -->

## PriceAdapter

* The [PriceAdapter](./price_adapter/README.md) contract is updated from one or more off-chain processes.
* The data are written to a [`PriceData`](./redstone-solana-price-adapter/src/state.rs) account created per Feed id.
* The contract can be read by one of `view` functions.
* The parameters` update doesn't change the contract code
* Logic update requires changing the code.
  * Still, **the account [`PriceData`](./redstone-solana-price-adapter/src/state.rs) ID remains unchanged**
  and is readable.


## Usage
Example of reading price data of a feed. To get account address of the `price_info` you can use following snipet:

```ts
const PROGRAM_ID = new PublicKey("REDSTBDUecGjwXd6YGPzHSvEUBHQqVRfCcjUVgPiHsr")
const FEED_ID = "ETH"

const makeFeedIdBytes = (feedId: string) => {
    return Buffer.from(feedId.padEnd(32, "\0"));
};

const makePriceSeed = () => {
    return Buffer.from("price".padEnd(32, "\0"));
};
const seeds = [
    makePriceSeed(),
    makeFeedIdBytes(FEED_ID)
]
const address = PublicKey.findProgramAddressSync(
    seeds
    PROGRAM_ID
)[0];
```

Once you have it, you can read from it like that:

```rust
use anchor_lang::prelude::*;
use anchor_lang::Discriminator;

#[account]
pub struct PriceData {
    pub feed_id: [u8; 32],
    pub value: [u8; 32],
    pub timestamp: u64,
    pub write_timestamp: Option<u64>,
    pub update_slot: u64m
    pub decimals: u8,
    _reserved: [u8; 64]
}


fn redstone_value_to_price(raw_be_value: [u8; 32]) -> Result<u64> {
    if !raw_be_value.iter().take(24).all(|&v| v == 0) {
        warn!("Price overflow u64");
        return Err(...); // OVERFLOW
    }

    u64::from_be_bytes(raw_be_value[24..].try_into().unwrap())
}

#[program]
pub mod test_x {
    use super::*;
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let price_data: PriceData = account_deserialize(&ctx.accounts.price_info);

        let value = redstone_value_to_price(price_data.value)
        msg!("FeedId: {:?}, {:?}", price_data.feed_id, value);
        Ok(())
    }
}
pub fn account_deserialize<T: AccountDeserialize + Discriminator>(
    account: &AccountInfo<'_>,
) -> T {
    let data = account.clone().data.borrow().to_owned();
    let discriminator = data.get(..8).unwrap();
    if discriminator != T::discriminator() {
        panic!(
            "Expected discriminator for account {:?} ({:?}) is different from received {:?}",
            account.key(),
            T::discriminator(),
            discriminator
        );
    }
    let mut data: &[u8] = &data;
    T::try_deserialize(&mut data).unwrap()
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    /// CHECK: ...
    #[account()]
    pub price_info: AccountInfo<'info>,
}
```

### Feed accounts

|                            | mainnet-beta                                 | testnet                                      | devnet                                       |
| -------------------------- | -------------------------------------------- | -------------------------------------------- | -------------------------------------------- |
| ETH                        | HPmPoq3eUTPePsDB5U4G6msu5RpeZHhMemc5VnqxQ9Lx | BsFkAfSgub54ZMHxZpCXqB3zpWXF8NwAswbuNX1Jq55g | 6bgjyNJ18vWGjw2qjjseSBaDK4QbJF8sjsHAhwy8EuBW |
| BTC                        | 74o5fhuMC33HgfUqvv2TdpYiKvEWfcRTS1E8zxK6ESjN | FbTaAY9o6MU3xZKXT65xE3wATNrxU7nTnZZPmg4gS9Ad | AhQGbBqhbcqJhV7WJ5GktjtjM7dHBPYv2uFhL7Cy7gzQ |
| BUIDL_SOLANA_FUNDAMENTAL   | ESxdEASDcYRN4ybnYNCJJuPHcF2SGJN1MypQq1yfY9Kz | x | x |
| BUIDL_SOLANA_DAILY_ACCRUAL | CPKJ57Kvxf8Xrz1o3hqBK52SqqEUAPp1NVdCK94bDGSX | x | x |
| ACRED_SOLANA_FUNDAMENTAL   | 6sK8czVw8Xy6T8YbH6VC8p5ovNZD2mXf5vUTv8sgnUJf | x | x |
| sUSDS_FUNDAMENTAL          | x | x | BsakcTH9iP8vqvf9SvA6jQQfjn48qhCrUdP1EX4h1smY |
