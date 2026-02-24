use crate::errors::ViralSyncError;
use crate::state::token_generation::TokenGeneration;
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{burn, Burn, Mint, TokenAccount, TokenInterface};

#[derive(Accounts)]
pub struct BurnTokens<'info> {
    #[account(
        mut,
        constraint = token_generation.owner == owner.key() @ ViralSyncError::InvalidAuthority,
        constraint = token_generation.mint == mint.key() @ ViralSyncError::InvalidMint
    )]
    pub token_generation: Account<'info, TokenGeneration>,

    #[account(
        mut,
        constraint = owner_ata.owner == owner.key() @ ViralSyncError::InvalidAuthority,
        constraint = owner_ata.mint == mint.key() @ ViralSyncError::InvalidMint
    )]
    pub owner_ata: InterfaceAccount<'info, TokenAccount>,

    pub owner: Signer<'info>,

    #[account(mut)]
    pub mint: InterfaceAccount<'info, Mint>,

    pub token_program: Interface<'info, TokenInterface>,
}

pub fn burn_tokens(ctx: Context<BurnTokens>, amount: u64) -> Result<()> {
    let gen = &mut ctx.accounts.token_generation;

    let total = gen.gen1_balance as u128 + gen.gen2_balance as u128 + gen.dead_balance as u128;
    require!(total >= amount as u128, ViralSyncError::InsufficientBalance);

    // Reverse FIFO: consume dead first, then gen2, then gen1.
    let from_dead = amount.min(gen.dead_balance);
    let remaining = amount.saturating_sub(from_dead);

    let from_gen2 = remaining.min(gen.gen2_balance);
    let remaining2 = remaining.saturating_sub(from_gen2);

    let from_gen1 = remaining2.min(gen.gen1_balance);

    require!(
        from_dead + from_gen2 + from_gen1 == amount,
        ViralSyncError::InsufficientBalance
    );

    gen.dead_balance = gen
        .dead_balance
        .checked_sub(from_dead)
        .ok_or(ViralSyncError::MathOverflow)?;
    gen.gen2_balance = gen
        .gen2_balance
        .checked_sub(from_gen2)
        .ok_or(ViralSyncError::MathOverflow)?;
    gen.gen1_balance = gen
        .gen1_balance
        .checked_sub(from_gen1)
        .ok_or(ViralSyncError::MathOverflow)?;

    let cpi_accounts = Burn {
        mint: ctx.accounts.mint.to_account_info(),
        from: ctx.accounts.owner_ata.to_account_info(),
        authority: ctx.accounts.owner.to_account_info(),
    };

    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    burn(cpi_ctx, amount)?;

    Ok(())
}
