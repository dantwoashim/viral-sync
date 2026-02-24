use crate::errors::ViralSyncError;
use crate::state::{
    commission_ledger::CommissionLedger,
    dispute_record::{DisputeRecord, DisputeStatus},
    merchant_reputation::MerchantReputation,
};
use anchor_lang::prelude::*;

pub const DISPUTE_MERCHANT_RESPONSE_SECS: i64 = 1_209_600; // 14 days

#[event]
pub struct DisputeAutoUpheld {
    pub merchant: Pubkey,
    pub referral: Pubkey,
    pub disputed_amount: u64,
    pub watchdog_reward: u64,
}

#[derive(Accounts)]
pub struct ResolveExpiredDispute<'info> {
    #[account(
        mut,
        constraint = dispute_record.watchdog == watchdog.key() @ ViralSyncError::InvalidAuthority
    )]
    pub dispute_record: Account<'info, DisputeRecord>,

    #[account(
        mut,
        constraint = commission_ledger.merchant == dispute_record.merchant @ ViralSyncError::InvalidAuthority
    )]
    pub commission_ledger: Account<'info, CommissionLedger>,

    #[account(
        mut,
        constraint = merchant_reputation.merchant == dispute_record.merchant @ ViralSyncError::InvalidAuthority
    )]
    pub merchant_reputation: Account<'info, MerchantReputation>,

    /// CHECK: stake escrow vault plumbing is intentionally deferred.
    #[account(mut)]
    pub dispute_escrow: UncheckedAccount<'info>,

    #[account(mut)]
    pub watchdog: Signer<'info>,
}

pub fn resolve_expired_dispute(ctx: Context<ResolveExpiredDispute>) -> Result<()> {
    let dispute = &mut ctx.accounts.dispute_record;
    let now = Clock::get()?.unix_timestamp;

    require!(
        dispute.status == DisputeStatus::Pending,
        ViralSyncError::AccessDenied
    );
    require!(
        now > dispute.raised_at + DISPUTE_MERCHANT_RESPONSE_SECS,
        ViralSyncError::TokensExpired
    );

    dispute.status = DisputeStatus::UpheldByTimeout;
    dispute.resolved_at = Some(now);

    let commission_ledger = &mut ctx.accounts.commission_ledger;
    let disputed_amount = commission_ledger.frozen_amount;
    let watchdog_share = disputed_amount / 2;

    commission_ledger.frozen = false;
    commission_ledger.frozen_amount = 0;

    let rep = &mut ctx.accounts.merchant_reputation;
    rep.timeout_disputes = rep
        .timeout_disputes
        .checked_add(1)
        .ok_or(ViralSyncError::MathOverflow)?;
    rep.reputation_score = rep.reputation_score.saturating_sub(500);

    emit!(DisputeAutoUpheld {
        merchant: dispute.merchant,
        referral: dispute.referral,
        disputed_amount,
        watchdog_reward: watchdog_share,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct RaiseDispute<'info> {
    #[account(
        mut,
        constraint = dispute_record.merchant == commission_ledger.merchant @ ViralSyncError::InvalidAuthority,
        constraint = dispute_record.watchdog == Pubkey::default() || dispute_record.watchdog == watchdog.key() @ ViralSyncError::InvalidAuthority
    )]
    pub dispute_record: Account<'info, DisputeRecord>,

    #[account(mut)]
    pub commission_ledger: Account<'info, CommissionLedger>,

    #[account(mut)]
    pub watchdog: Signer<'info>,
}

pub fn raise_dispute(ctx: Context<RaiseDispute>, amount: u64) -> Result<()> {
    require!(amount > 0, ViralSyncError::BelowMinimum);

    let dispute = &mut ctx.accounts.dispute_record;
    require!(
        dispute.status != DisputeStatus::Pending,
        ViralSyncError::AccessDenied
    );

    let ledger = &mut ctx.accounts.commission_ledger;
    require!(ledger.claimable >= amount, ViralSyncError::InsufficientBalance);

    dispute.status = DisputeStatus::Pending;
    dispute.watchdog = ctx.accounts.watchdog.key();
    dispute.raised_at = Clock::get()?.unix_timestamp;
    dispute.resolved_at = None;

    ledger.claimable = ledger
        .claimable
        .checked_sub(amount)
        .ok_or(ViralSyncError::MathOverflow)?;
    ledger.frozen = true;
    ledger.frozen_amount = ledger
        .frozen_amount
        .checked_add(amount)
        .ok_or(ViralSyncError::MathOverflow)?;

    Ok(())
}
