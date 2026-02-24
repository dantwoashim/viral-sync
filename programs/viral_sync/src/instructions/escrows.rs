use crate::errors::ViralSyncError;
use crate::state::token_generation::TokenGeneration;
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked,
};

#[derive(Accounts)]
pub struct CreateEscrowShare<'info> {
    #[account(
        mut,
        constraint = source_generation.owner == source.key() @ ViralSyncError::InvalidAuthority,
        constraint = source_generation.mint == mint.key() @ ViralSyncError::InvalidMint
    )]
    pub source_generation: Account<'info, TokenGeneration>,

    // Client pre-flight is expected to have called init_token_generation for it.
    #[account(
        mut,
        constraint = escrow_generation.mint == mint.key() @ ViralSyncError::InvalidMint,
        constraint = escrow_generation.owner == escrow_ata.key() @ ViralSyncError::InvalidAuthority,
    )]
    pub escrow_generation: Account<'info, TokenGeneration>,

    #[account(
        mut,
        constraint = source_ata.owner == source.key() @ ViralSyncError::InvalidAuthority,
        constraint = source_ata.mint == mint.key() @ ViralSyncError::InvalidMint
    )]
    pub source_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(mut, constraint = escrow_ata.mint == mint.key() @ ViralSyncError::InvalidMint)]
    pub escrow_ata: InterfaceAccount<'info, TokenAccount>,

    pub source: Signer<'info>,

    pub mint: InterfaceAccount<'info, Mint>,

    pub token_program: Interface<'info, TokenInterface>,
}

pub fn create_escrow_share(ctx: Context<CreateEscrowShare>, amount: u64) -> Result<()> {
    require!(amount > 0, ViralSyncError::BelowMinimum);

    let src_gen = &mut ctx.accounts.source_generation;
    let escrow_gen = &mut ctx.accounts.escrow_generation;

    if escrow_gen.is_intermediary {
        require!(
            escrow_gen.original_sender == src_gen.owner,
            ViralSyncError::InvalidAuthority
        );
    } else {
        escrow_gen.is_intermediary = true;
        escrow_gen.original_sender = src_gen.owner;
    }

    let cpi_accounts = TransferChecked {
        from: ctx.accounts.source_ata.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        to: ctx.accounts.escrow_ata.to_account_info(),
        authority: ctx.accounts.source.to_account_info(),
    };

    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    transfer_checked(cpi_ctx, amount, ctx.accounts.mint.decimals)?;

    Ok(())
}

#[derive(Accounts)]
pub struct ClaimEscrow<'info> {
    #[account(
        mut,
        constraint = escrow_generation.is_intermediary @ ViralSyncError::InvalidAuthority,
        constraint = escrow_generation.mint == mint.key() @ ViralSyncError::InvalidMint,
        constraint = escrow_generation.owner == escrow_ata.key() @ ViralSyncError::InvalidAuthority,
    )]
    pub escrow_generation: Account<'info, TokenGeneration>,

    #[account(
        mut,
        constraint = dest_generation.mint == mint.key() @ ViralSyncError::InvalidMint,
        constraint = dest_generation.owner == dest_ata.owner @ ViralSyncError::InvalidAuthority
    )]
    pub dest_generation: Account<'info, TokenGeneration>,

    #[account(
        mut,
        constraint = escrow_ata.mint == mint.key() @ ViralSyncError::InvalidMint,
        constraint = escrow_ata.owner == escrow_authority.key() @ ViralSyncError::InvalidAuthority
    )]
    pub escrow_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(mut, constraint = dest_ata.mint == mint.key() @ ViralSyncError::InvalidMint)]
    pub dest_ata: InterfaceAccount<'info, TokenAccount>,

    pub escrow_authority: Signer<'info>,

    pub mint: InterfaceAccount<'info, Mint>,

    pub token_program: Interface<'info, TokenInterface>,
}

pub fn claim_escrow(ctx: Context<ClaimEscrow>, amount: u64) -> Result<()> {
    require!(amount > 0, ViralSyncError::BelowMinimum);

    let cpi_accounts = TransferChecked {
        from: ctx.accounts.escrow_ata.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        to: ctx.accounts.dest_ata.to_account_info(),
        authority: ctx.accounts.escrow_authority.to_account_info(),
    };

    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    transfer_checked(cpi_ctx, amount, ctx.accounts.mint.decimals)?;

    Ok(())
}

#[derive(Accounts)]
pub struct HarvestExpiredEscrows<'info> {
    /// CHECK: Placeholder until full crank implementation is introduced.
    pub config: UncheckedAccount<'info>,
}

pub fn harvest_expired_escrows(_ctx: Context<HarvestExpiredEscrows>) -> Result<()> {
    // Crank operation validating escrows older than expiry windows returning funds to source.
    Ok(())
}
