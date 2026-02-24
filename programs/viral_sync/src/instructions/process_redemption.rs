use crate::errors::ViralSyncError;
use crate::state::{
    commission_ledger::CommissionLedger, referral_record::ReferralRecord,
    token_generation::TokenGeneration,
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct ProcessRedemptionSlot<'info> {
    #[account(mut)]
    pub redeemer: Signer<'info>, // Permissionless crank/redeemer is allowed.

    #[account(mut)]
    pub redeemer_generation: Account<'info, TokenGeneration>,

    #[account(
        mut,
        constraint = referral_record.mint == redeemer_generation.mint @ ViralSyncError::InvalidMint,
        constraint = referral_record.referred == redeemer_generation.owner @ ViralSyncError::InvalidAuthority,
    )]
    pub referral_record: Account<'info, ReferralRecord>,

    #[account(
        mut,
        constraint = commission_ledger.referrer == referral_record.referrer @ ViralSyncError::InvalidAuthority,
        constraint = commission_ledger.merchant == referral_record.merchant @ ViralSyncError::InvalidAuthority,
        constraint = commission_ledger.mint == referral_record.mint @ ViralSyncError::InvalidMint,
    )]
    pub commission_ledger: Account<'info, CommissionLedger>,
}

pub fn process_redemption_slot(ctx: Context<ProcessRedemptionSlot>, slot_idx: u8) -> Result<()> {
    let gen = &mut ctx.accounts.redeemer_generation;
    let referral = &mut ctx.accounts.referral_record;
    let ledger = &mut ctx.accounts.commission_ledger;

    require!(gen.redemption_pending, ViralSyncError::NoRedemptionPending);
    require!(gen.active_referrer_slots <= 4, ViralSyncError::InvalidReferrerSlot);
    require!(slot_idx < gen.active_referrer_slots, ViralSyncError::InvalidReferrerSlot);

    let slot = gen.referrer_slots[slot_idx as usize];
    require!(slot.is_active, ViralSyncError::InvalidReferrerSlot);
    require!(
        slot.referral_record == referral.key(),
        ViralSyncError::InvalidReferrerSlot
    );
    require!(
        slot.referrer == referral.referrer,
        ViralSyncError::InvalidReferrerSlot
    );

    let slot_mask = 1u8
        .checked_shl(slot_idx as u32)
        .ok_or(ViralSyncError::MathOverflow)?;
    require!(
        (gen.redemption_slots_settled & slot_mask) == 0,
        ViralSyncError::SlotAlreadySettled
    );

    let gen2_consumed = gen.redemption_slot_consumed[slot_idx as usize];
    if gen2_consumed > 0 && referral.is_active {
        let commission_exact_u128 = (gen2_consumed as u128)
            .checked_mul(referral.committed_commission_bps as u128)
            .ok_or(ViralSyncError::MathOverflow)?;

        let commission_whole = (commission_exact_u128 / 10_000) as u64;
        let commission_dust_tenths = (commission_exact_u128 % 10_000) as u32;

        let remaining_cap = referral
            .max_commission_cap
            .saturating_sub(referral.commission_earned);
        let commission_to_credit = commission_whole.min(remaining_cap);

        if commission_to_credit > 0 {
            ledger.claimable = ledger
                .claimable
                .checked_add(commission_to_credit)
                .ok_or(ViralSyncError::MathOverflow)?;
            ledger.dust_tenths_accumulated = ledger
                .dust_tenths_accumulated
                .checked_add(commission_dust_tenths)
                .ok_or(ViralSyncError::MathOverflow)?;

            if ledger.dust_tenths_accumulated >= 10_000 {
                let bonus_whole = ledger.dust_tenths_accumulated / 10_000;
                ledger.claimable = ledger
                    .claimable
                    .checked_add(bonus_whole as u64)
                    .ok_or(ViralSyncError::MathOverflow)?;
                ledger.dust_tenths_accumulated %= 10_000;
                ledger.total_earned = ledger
                    .total_earned
                    .checked_add(bonus_whole as u64)
                    .ok_or(ViralSyncError::MathOverflow)?;
            }

            ledger.total_earned = ledger
                .total_earned
                .checked_add(commission_to_credit)
                .ok_or(ViralSyncError::MathOverflow)?;
            ledger.total_redemptions_driven = ledger
                .total_redemptions_driven
                .checked_add(1)
                .ok_or(ViralSyncError::MathOverflow)?;

            if commission_to_credit > ledger.highest_single_commission {
                ledger.highest_single_commission = commission_to_credit;
            }

            referral.commission_earned = referral
                .commission_earned
                .checked_add(commission_to_credit)
                .ok_or(ViralSyncError::MathOverflow)?;
            // Settled here means "fully attributed/settled into the ledger".
            referral.commission_settled = referral
                .commission_settled
                .checked_add(commission_to_credit)
                .ok_or(ViralSyncError::MathOverflow)?;
        }
    }

    gen.redemption_slots_settled |= slot_mask;
    Ok(())
}

#[derive(Accounts)]
pub struct ClearRedemptionPending<'info> {
    #[account(mut, constraint = redeemer_generation.owner == redeemer.key() @ ViralSyncError::InvalidAuthority)]
    pub redeemer_generation: Account<'info, TokenGeneration>,

    pub redeemer: Signer<'info>,
}

pub fn clear_redemption_pending(ctx: Context<ClearRedemptionPending>) -> Result<()> {
    let gen = &mut ctx.accounts.redeemer_generation;
    require!(gen.redemption_pending, ViralSyncError::NoRedemptionPending);
    require!(gen.active_referrer_slots <= 4, ViralSyncError::InvalidReferrerSlot);

    let required_mask = if gen.active_referrer_slots == 0 {
        0
    } else {
        (1u8
            .checked_shl(gen.active_referrer_slots as u32)
            .ok_or(ViralSyncError::MathOverflow)?)
            - 1
    };
    require!(
        gen.redemption_slots_settled == required_mask,
        ViralSyncError::UnsettledSlotsRemain
    );

    gen.redemption_pending = false;
    gen.redemption_slot_consumed = [0; 4];
    gen.redemption_slots_settled = 0;

    Ok(())
}
