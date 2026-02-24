use crate::errors::ViralSyncError;
use crate::state::{
    merchant_bond::MerchantBond, merchant_config::MerchantConfig, token_generation::TokenGeneration,
};
use anchor_lang::prelude::*;

pub const CLOSE_WINDOW_SECS: i64 = 2_592_000; // 30 Days

#[event]
pub struct MerchantCloseInitiated {
    pub merchant: Pubkey,
    pub mint: Pubkey,
    pub outstanding_tokens: u64,
    pub close_window_ends_at: i64,
}

#[event]
pub struct MerchantClosed {
    pub merchant: Pubkey,
    pub mint: Pubkey,
}

#[event]
pub struct BondShareRedeemed {
    pub holder: Pubkey,
    pub lamports: u64,
}

#[derive(Accounts)]
pub struct WithdrawBond<'info> {
    #[account(mut, has_one = merchant)]
    pub merchant_bond: Account<'info, MerchantBond>,
    pub merchant: Signer<'info>,
}

pub fn withdraw_bond(ctx: Context<WithdrawBond>, amount: u64) -> Result<()> {
    let bond = &mut ctx.accounts.merchant_bond;

    require!(!bond.is_locked, ViralSyncError::AccessDenied);
    require!(
        bond.bonded_lamports.saturating_sub(amount) >= bond.min_required_lamports,
        ViralSyncError::InsufficientBalance
    );

    bond.bonded_lamports = bond
        .bonded_lamports
        .checked_sub(amount)
        .ok_or(ViralSyncError::MathOverflow)?;
    Ok(())
}

#[derive(Accounts)]
pub struct InitiateCloseMerchant<'info> {
    #[account(mut, has_one = merchant)]
    pub merchant_config: Account<'info, MerchantConfig>,
    pub merchant: Signer<'info>,
}

pub fn initiate_close_merchant(ctx: Context<InitiateCloseMerchant>) -> Result<()> {
    let config = &mut ctx.accounts.merchant_config;
    require!(config.is_active, ViralSyncError::AccessDenied);

    config.is_active = false;
    config.close_initiated_at = Clock::get()?.unix_timestamp;
    config.close_window_ends_at = config
        .close_initiated_at
        .checked_add(CLOSE_WINDOW_SECS)
        .ok_or(ViralSyncError::MathOverflow)?;

    emit!(MerchantCloseInitiated {
        merchant: config.merchant,
        mint: config.mint,
        outstanding_tokens: config.current_supply,
        close_window_ends_at: config.close_window_ends_at,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct FinalizeCloseMerchant<'info> {
    #[account(mut, has_one = merchant)]
    pub merchant_config: Account<'info, MerchantConfig>,
    #[account(has_one = merchant)]
    pub merchant_bond: Account<'info, MerchantBond>,
    #[account(mut)]
    pub merchant: Signer<'info>,
    /// CHECK: Placeholder vault account for future lamport transfer integration.
    #[account(mut)]
    pub bond_account: UncheckedAccount<'info>,
}

pub fn finalize_close_merchant(ctx: Context<FinalizeCloseMerchant>) -> Result<()> {
    let config = &ctx.accounts.merchant_config;
    let now = Clock::get()?.unix_timestamp;

    require!(!config.is_active, ViralSyncError::AccessDenied);
    require!(
        now > config.close_window_ends_at,
        ViralSyncError::TokensExpired
    );

    emit!(MerchantClosed {
        merchant: config.merchant,
        mint: config.mint,
    });
    Ok(())
}

#[derive(Accounts)]
pub struct RedeemBondShare<'info> {
    pub merchant_config: Account<'info, MerchantConfig>,

    #[account(
        mut,
        constraint = holder_generation.owner == holder.key() @ ViralSyncError::InvalidAuthority,
        constraint = holder_generation.mint == merchant_config.mint @ ViralSyncError::InvalidMint
    )]
    pub holder_generation: Account<'info, TokenGeneration>,

    #[account(mut)]
    pub merchant_bond: Account<'info, MerchantBond>,

    #[account(mut)]
    pub holder: Signer<'info>,

    /// CHECK: Placeholder vault account for future lamport transfer integration.
    #[account(mut)]
    pub bond_account: UncheckedAccount<'info>,
}

pub fn redeem_bond_share(ctx: Context<RedeemBondShare>) -> Result<()> {
    let config = &ctx.accounts.merchant_config;
    let gen = &mut ctx.accounts.holder_generation;
    let bond = &mut ctx.accounts.merchant_bond;
    let now = Clock::get()?.unix_timestamp;

    require!(!config.is_active, ViralSyncError::AccessDenied);
    require!(
        now > config.close_window_ends_at,
        ViralSyncError::TokensExpired
    );
    require!(config.current_supply > 0, ViralSyncError::InsufficientBalance);

    let holder_tokens = gen
        .gen1_balance
        .checked_add(gen.gen2_balance)
        .ok_or(ViralSyncError::MathOverflow)?
        .checked_add(gen.dead_balance)
        .ok_or(ViralSyncError::MathOverflow)?;
    require!(holder_tokens > 0, ViralSyncError::NothingToClaim);

    let bond_share_u128 = (bond.bonded_lamports as u128)
        .checked_mul(holder_tokens as u128)
        .ok_or(ViralSyncError::MathOverflow)?
        .checked_div(config.current_supply as u128)
        .ok_or(ViralSyncError::MathOverflow)?;
    let bond_share: u64 = bond_share_u128
        .try_into()
        .map_err(|_| error!(ViralSyncError::MathOverflow))?;

    require!(bond_share > 0, ViralSyncError::NothingToClaim);
    bond.bonded_lamports = bond
        .bonded_lamports
        .checked_sub(bond_share)
        .ok_or(ViralSyncError::MathOverflow)?;

    // Burn claim entitlement from generation state to prevent double-claim.
    gen.gen1_balance = 0;
    gen.gen2_balance = 0;
    gen.dead_balance = 0;

    emit!(BondShareRedeemed {
        holder: gen.owner,
        lamports: bond_share,
    });
    Ok(())
}
