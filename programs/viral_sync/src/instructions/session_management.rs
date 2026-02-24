use crate::errors::ViralSyncError;
use crate::state::{session_key::SessionKey, token_generation::TokenGeneration};
use anchor_lang::prelude::*;

const MAX_SESSION_TTL_SECS: i64 = 7 * 24 * 60 * 60;

#[derive(Accounts)]
pub struct CreateSessionKey<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 1 + 32 + 32 + 32 + 8 + 8 + 8 + 1,
        seeds = [b"session", token_generation.key().as_ref(), delegate.key().as_ref()],
        bump
    )]
    pub session_key: Account<'info, SessionKey>,

    pub token_generation: Account<'info, TokenGeneration>,

    /// CHECK: ephemeral local keypair public key.
    pub delegate: UncheckedAccount<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn create_session_key(
    ctx: Context<CreateSessionKey>,
    expires_at: i64,
    max_tokens_per_session: u64,
) -> Result<()> {
    let session = &mut ctx.accounts.session_key;
    let gen = &ctx.accounts.token_generation;
    let now = Clock::get()?.unix_timestamp;

    require!(gen.owner == ctx.accounts.authority.key(), ViralSyncError::AccessDenied);
    require!(expires_at > now, ViralSyncError::TokensExpired);
    require!(
        expires_at - now <= MAX_SESSION_TTL_SECS,
        ViralSyncError::AccessDenied
    );
    require!(max_tokens_per_session > 0, ViralSyncError::BelowMinimum);

    session.bump = ctx.bumps.session_key;
    session.authority = ctx.accounts.authority.key();
    session.target_generation = gen.key();
    session.delegate = ctx.accounts.delegate.key();
    session.expires_at = expires_at;
    session.max_tokens_per_session = max_tokens_per_session;
    session.tokens_spent = 0;
    session.is_active = true;

    Ok(())
}

#[derive(Accounts)]
pub struct RevokeSessionKey<'info> {
    #[account(mut, close = authority, has_one = authority)]
    pub session_key: Account<'info, SessionKey>,

    #[account(mut)]
    pub authority: Signer<'info>,
}

pub fn revoke_session_key(_ctx: Context<RevokeSessionKey>) -> Result<()> {
    Ok(())
}
