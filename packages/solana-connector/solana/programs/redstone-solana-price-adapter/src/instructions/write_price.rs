use crate::config::SOLANA_CONFIG;
use crate::{
    state::{PriceData, REDSTONE_DECIMALS_EXP},
    util::{current_time_as_millis, debug_msg, make_price_seed},
    FeedIdBs,
};
use anchor_lang::prelude::*;
use redstone::FeedValue;
use redstone::{
    contract::verification::UpdateTimestampVerifier, core::processor::process_payload,
    network::as_str::AsHexStr, network::error::Error as RedStoneError,
    solana::SolanaRedStoneConfig, ConfigFactory,
};

#[derive(Accounts)]
#[instruction(feed_id: FeedIdBs)]
pub struct WritePrice<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        init_if_needed,
        payer = user,
        space = 8 + std::mem::size_of::<PriceData>(),
        seeds = [
            &make_price_seed(),
            &feed_id
        ],
        bump,
        constraint = price_account.to_account_info().owner == __program_id
    )]
    pub price_account: Account<'info, PriceData>,
    pub system_program: Program<'info, System>,
}

pub fn write_price(ctx: Context<WritePrice>, feed_id: FeedIdBs, payload: Vec<u8>) -> Result<()> {
    let feed_id = feed_id.into();
    let block_timestamp = current_time_as_millis()?;

    let mut config: SolanaRedStoneConfig =
        SOLANA_CONFIG.redstone_config((), vec![feed_id], block_timestamp)?;

    let processed_payload = process_payload(&mut config, payload)?;

    if processed_payload.values.is_empty() {
        return Err(RedStoneError::ArrayIsEmpty.into());
    }

    let FeedValue { value, .. } = processed_payload.values[0];
    let price_account = &mut ctx.accounts.price_account;

    UpdateTimestampVerifier::verifier(&ctx.accounts.user.key(), &SOLANA_CONFIG.trusted_updaters)
        .verify_timestamp(
            block_timestamp,
            price_account.write_timestamp.map(Into::into),
            SOLANA_CONFIG.min_interval_between_updates_ms.into(),
            Some(price_account.timestamp.into()),
            processed_payload.timestamp,
        )?;

    price_account.value = value.0;
    price_account.timestamp = processed_payload.timestamp.as_millis();
    price_account.feed_id = feed_id.into();
    price_account.write_timestamp = Some(block_timestamp.as_millis());
    price_account.write_slot_number = Clock::get()?.slot;
    price_account.decimals = REDSTONE_DECIMALS_EXP;

    debug_msg(|| {
        format!(
            "{} {}: {:?}",
            ctx.accounts.price_account.timestamp,
            feed_id.as_hex_str(),
            value.0,
        )
    });

    Ok(())
}
