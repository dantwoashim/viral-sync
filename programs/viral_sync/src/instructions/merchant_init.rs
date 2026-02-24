use crate::errors::ViralSyncError;
use crate::state::merchant_config::MerchantConfig;
use anchor_lang::prelude::*;
use anchor_spl::token_interface::Mint;

const DEFAULT_MIN_TOKENS_PER_REFERRAL: u64 = 1;
const DEFAULT_MAX_TOKENS_PER_REFERRAL: u64 = 1_000_000_000_000;
const DEFAULT_MAX_REFERRALS_PER_DAY: u16 = 100;
const DEFAULT_SLOTS_PER_DAY: u64 = 216_000;

// Phase 1: create_mint_and_config
#[derive(Accounts)]
pub struct CreateMintAndConfig<'info> {
    #[account(
        init,
        payer = merchant,
        space = 8 + 200,
        seeds = [b"merchant", mint.key().as_ref()],
        bump
    )]
    pub merchant_config: Account<'info, MerchantConfig>,

    #[account(mut)]
    pub merchant: Signer<'info>,

    // Mint should be created with Token Extensions correctly here, but we pass it as pre-created for MVP structure.
    pub mint: InterfaceAccount<'info, Mint>,

    pub system_program: Program<'info, System>,
}

pub fn create_mint_and_config(
    ctx: Context<CreateMintAndConfig>,
    commission_rate_bps: u16,
    transfer_fee_bps: u16,
    min_hold_before_share_secs: i64,
) -> Result<()> {
    require!(commission_rate_bps <= 10_000, ViralSyncError::InvalidFeeConfig);
    require!(transfer_fee_bps < 10_000, ViralSyncError::InvalidFeeConfig);
    require!(min_hold_before_share_secs >= 0, ViralSyncError::InvalidAuthority);

    let config = &mut ctx.accounts.merchant_config;

    config.bump = ctx.bumps.merchant_config;
    config.merchant = ctx.accounts.merchant.key();
    config.mint = ctx.accounts.mint.key();
    config.is_active = true;

    config.commission_rate_bps = commission_rate_bps;
    config.transfer_fee_bps = transfer_fee_bps;
    config.min_hold_before_share_secs = min_hold_before_share_secs;

    config.min_tokens_per_referral = DEFAULT_MIN_TOKENS_PER_REFERRAL;
    config.max_tokens_per_referral = DEFAULT_MAX_TOKENS_PER_REFERRAL;
    config.max_referrals_per_wallet_per_day = DEFAULT_MAX_REFERRALS_PER_DAY;
    config.allow_second_gen_transfer = false;
    config.slots_per_day = DEFAULT_SLOTS_PER_DAY;
    config.token_expiry_days = 0;

    config.first_issuance_done = false;
    config.current_supply = 0;
    config.tokens_issued = 0;
    config.close_initiated_at = 0;
    config.close_window_ends_at = 0;

    Ok(())
}

// Phase 3: issue_first_tokens_and_lock
#[derive(Accounts)]
pub struct IssueFirstTokensAndLock<'info> {
    #[account(mut, has_one = merchant, has_one = mint)]
    pub merchant_config: Account<'info, MerchantConfig>,
    pub merchant: Signer<'info>,
    pub mint: InterfaceAccount<'info, Mint>,
}

pub fn issue_first_tokens_and_lock(ctx: Context<IssueFirstTokensAndLock>, amount: u64) -> Result<()> {
    require!(amount > 0, ViralSyncError::BelowMinimum);
    let config = &mut ctx.accounts.merchant_config;

    require!(!config.first_issuance_done, ViralSyncError::AccessDenied);

    config.first_issuance_done = true;
    config.current_supply = config
        .current_supply
        .checked_add(amount)
        .ok_or(ViralSyncError::MathOverflow)?;
    config.tokens_issued = config
        .tokens_issued
        .checked_add(amount)
        .ok_or(ViralSyncError::MathOverflow)?;

    Ok(())
}
