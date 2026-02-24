use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount};

use crate::state::token_generation::{InboundEntry, TokenGeneration, INBOUND_BUFFER_SIZE};

#[derive(Accounts)]
pub struct InitTreasuryGen<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + 1700,
        seeds = [b"gen", mint.key().as_ref(), treasury_ata.key().as_ref()],
        bump
    )]
    pub treasury_generation: Account<'info, TokenGeneration>,

    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(constraint = treasury_ata.mint == mint.key())]
    pub treasury_ata: InterfaceAccount<'info, TokenAccount>,

    pub mint: InterfaceAccount<'info, Mint>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitTreasuryGen>) -> Result<()> {
    let gen = &mut ctx.accounts.treasury_generation;

    gen.bump = ctx.bumps.treasury_generation;
    gen.version = 1;
    gen.mint = ctx.accounts.mint.key();
    // Token account owner must match transfer-hook extracted owner for source validation.
    gen.owner = ctx.accounts.treasury_ata.owner;

    // CRITICAL FLAG setting this up as a Treasury.
    gen.is_treasury = true;
    gen.is_intermediary = false;

    gen.gen1_balance = u64::MAX;
    gen.gen2_balance = 0;
    gen.dead_balance = 0;
    gen.total_lifetime = 0;

    gen.first_received_at = 0;
    gen.last_received_at = 0;

    gen.buffer_head = 0;
    gen.buffer_pending = 0;
    gen.inbound_buffer = [InboundEntry::default(); INBOUND_BUFFER_SIZE];
    gen.referrer_slots = Default::default();
    gen.active_referrer_slots = 0;

    gen.processing_nonce = 0;
    gen.redemption_pending = false;
    gen.redemption_slot = 0;
    gen.redemption_gen2_consumed = 0;
    gen.redemption_slot_consumed = [0; 4];
    gen.redemption_slots_settled = 0;

    gen.share_limit_day = 0;
    gen.shares_today = 0;
    gen.original_sender = Pubkey::default();
    gen.is_dex_pool = false;
    gen.poi_score = 0;
    gen.poi_updated_at = 0;
    gen.identity_commitment = None;
    gen.identity_provider = 0;

    Ok(())
}
