use crate::errors::ViralSyncError;
use crate::state::{
    commission_ledger::CommissionLedger, merchant_config::MerchantConfig,
    token_generation::TokenGeneration,
};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked,
};

#[derive(Accounts)]
pub struct ClaimCommission<'info> {
    #[account(
        mut,
        constraint = commission_ledger.referrer == referrer.key() @ ViralSyncError::InvalidAuthority,
        constraint = commission_ledger.merchant == merchant_config.merchant @ ViralSyncError::InvalidAuthority,
        constraint = commission_ledger.mint == mint.key() @ ViralSyncError::InvalidMint,
    )]
    pub commission_ledger: Account<'info, CommissionLedger>,

    #[account(constraint = merchant_config.mint == mint.key() @ ViralSyncError::InvalidMint)]
    pub merchant_config: Account<'info, MerchantConfig>,

    #[account(
        mut,
        constraint = treasury_generation.is_treasury @ ViralSyncError::InvalidAuthority,
        constraint = treasury_generation.mint == mint.key() @ ViralSyncError::InvalidMint,
        constraint = treasury_generation.owner == treasury_ata.owner @ ViralSyncError::InvalidAuthority,
    )]
    pub treasury_generation: Account<'info, TokenGeneration>,

    #[account(
        mut,
        constraint = treasury_ata.mint == mint.key() @ ViralSyncError::InvalidMint,
        constraint = treasury_ata.owner == treasury_signer.key() @ ViralSyncError::InvalidAuthority
    )]
    pub treasury_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        constraint = referrer_ata.mint == mint.key() @ ViralSyncError::InvalidMint,
        constraint = referrer_ata.owner == referrer.key() @ ViralSyncError::InvalidAuthority,
    )]
    pub referrer_ata: InterfaceAccount<'info, TokenAccount>,

    pub mint: InterfaceAccount<'info, Mint>,

    pub referrer: Signer<'info>,
    pub treasury_signer: Signer<'info>,

    pub token_program: Interface<'info, TokenInterface>,
}

pub fn claim_commission(ctx: Context<ClaimCommission>) -> Result<()> {
    let ledger = &mut ctx.accounts.commission_ledger;
    let config = &ctx.accounts.merchant_config;

    require!(!ledger.frozen, ViralSyncError::CommissionFrozenDictated);

    let gross_claimable = ledger.claimable;
    require!(gross_claimable > 0, ViralSyncError::NothingToClaim);

    let fee_bps = config.transfer_fee_bps as u128;
    require!(fee_bps < 10_000, ViralSyncError::InvalidFeeConfig);
    let denom = 10_000u128
        .checked_sub(fee_bps)
        .ok_or(ViralSyncError::InvalidFeeConfig)?;

    // Round up so the recipient receives at least `gross_claimable` after transfer fee.
    let numerator = (gross_claimable as u128)
        .checked_mul(10_000)
        .ok_or(ViralSyncError::MathOverflow)?;
    let gross_to_send_u128 = numerator
        .checked_add(denom - 1)
        .ok_or(ViralSyncError::MathOverflow)?
        .checked_div(denom)
        .ok_or(ViralSyncError::MathOverflow)?;
    let gross_to_send: u64 = gross_to_send_u128
        .try_into()
        .map_err(|_| error!(ViralSyncError::MathOverflow))?;

    let cpi_accounts = TransferChecked {
        from: ctx.accounts.treasury_ata.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        to: ctx.accounts.referrer_ata.to_account_info(),
        authority: ctx.accounts.treasury_signer.to_account_info(),
    };

    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    transfer_checked(cpi_ctx, gross_to_send, ctx.accounts.mint.decimals)?;

    ledger.total_claimed = ledger
        .total_claimed
        .checked_add(gross_claimable)
        .ok_or(ViralSyncError::MathOverflow)?;
    ledger.claimable = 0;

    Ok(())
}
