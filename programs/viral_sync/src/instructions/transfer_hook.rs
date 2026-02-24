use crate::errors::ViralSyncError;
use crate::events::*;
use crate::state::{
    merchant_config::{MerchantConfig, VaultEntry},
    token_generation::{GenSource, InboundEntry, TokenGeneration, INBOUND_BUFFER_SIZE},
};
use anchor_lang::prelude::*;
use anchor_spl::{token::ID as TOKEN_PROGRAM_ID, token_2022::ID as TOKEN_2022_PROGRAM_ID};
use spl_tlv_account_resolution::{account::ExtraAccountMeta, state::ExtraAccountMetaList};
use spl_transfer_hook_interface::instruction::ExecuteInstruction;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

// INITIALIZE EXTRA ACCOUNT METAS
#[derive(Accounts)]
pub struct InitExtraAccountMetaList<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: checked by token-2022 extension integration.
    #[account(mut)]
    pub extra_account_meta_list: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn initialize_extra_account_meta_list(ctx: Context<InitExtraAccountMetaList>) -> Result<()> {
    let extra_metas = &[
        // Account 5: MerchantConfig
        ExtraAccountMeta::new_with_seeds(
            &[
                spl_tlv_account_resolution::seeds::Seed::Literal {
                    bytes: b"merchant".to_vec(),
                },
                spl_tlv_account_resolution::seeds::Seed::AccountKey { index: 1 }, // mint
            ],
            false,
            false,
        )?,
        // Account 6: VaultEntry
        ExtraAccountMeta::new_with_seeds(
            &[
                spl_tlv_account_resolution::seeds::Seed::Literal {
                    bytes: b"vault_entry".to_vec(),
                },
                spl_tlv_account_resolution::seeds::Seed::AccountKey { index: 1 },
                spl_tlv_account_resolution::seeds::Seed::AccountData {
                    account_index: 2,
                    data_index: 32,
                    length: 32,
                },
            ],
            false,
            false,
        )?,
        // Account 7: Source TokenGeneration
        ExtraAccountMeta::new_with_seeds(
            &[
                spl_tlv_account_resolution::seeds::Seed::Literal {
                    bytes: b"gen".to_vec(),
                },
                spl_tlv_account_resolution::seeds::Seed::AccountKey { index: 1 },
                spl_tlv_account_resolution::seeds::Seed::AccountData {
                    account_index: 0,
                    data_index: 32,
                    length: 32,
                },
            ],
            false,
            true,
        )?,
        // Account 8: Dest TokenGeneration
        ExtraAccountMeta::new_with_seeds(
            &[
                spl_tlv_account_resolution::seeds::Seed::Literal {
                    bytes: b"gen".to_vec(),
                },
                spl_tlv_account_resolution::seeds::Seed::AccountKey { index: 1 },
                spl_tlv_account_resolution::seeds::Seed::AccountData {
                    account_index: 2,
                    data_index: 32,
                    length: 32,
                },
            ],
            false,
            true,
        )?,
    ];

    ExtraAccountMetaList::init::<ExecuteInstruction>(
        &mut ctx.accounts.extra_account_meta_list.try_borrow_mut_data()?,
        extra_metas,
    )?;

    Ok(())
}

// EXECUTE HOOK
#[derive(Accounts)]
pub struct ExecuteHook<'info> {
    /// CHECK: validated in helper and account constraints.
    #[account(mut)]
    pub source_token_account: UncheckedAccount<'info>,
    /// CHECK: token mint account passed by token-2022 hook.
    #[account(mut)]
    pub mint: UncheckedAccount<'info>,
    /// CHECK: validated in helper and account constraints.
    #[account(mut)]
    pub dest_token_account: UncheckedAccount<'info>,
    /// CHECK: signer/delegate from token transfer instruction.
    pub source_authority: UncheckedAccount<'info>,
    /// CHECK: handled by token-2022 extra-account-meta runtime.
    pub extra_account_meta_list: UncheckedAccount<'info>,

    #[account(constraint = merchant_config.mint == mint.key() @ ViralSyncError::InvalidMint)]
    pub merchant_config: Account<'info, MerchantConfig>,

    /// CHECK: optional PDA; parsed manually if present.
    pub vault_entry: UncheckedAccount<'info>,

    #[account(
        mut,
        constraint = source_generation.owner == read_owner_from_token_account(&source_token_account)? @ ViralSyncError::InvalidSourceGeneration,
        constraint = source_generation.mint == mint.key() @ ViralSyncError::InvalidMint,
    )]
    pub source_generation: Account<'info, TokenGeneration>,

    #[account(
        mut,
        constraint = dest_generation.owner == read_owner_from_token_account(&dest_token_account)? @ ViralSyncError::InvalidDestGeneration,
        constraint = dest_generation.mint == mint.key() @ ViralSyncError::InvalidMint,
    )]
    pub dest_generation: Account<'info, TokenGeneration>,
}

pub fn execute_transfer_hook(ctx: Context<ExecuteHook>, amount: u64) -> Result<()> {
    let src_gen = &mut ctx.accounts.source_generation;
    let dst_gen = &mut ctx.accounts.dest_generation;
    let config = &ctx.accounts.merchant_config;

    let src_owner = src_gen.owner;
    let dst_owner = dst_gen.owner;

    let is_from_merchant = src_owner == config.merchant;
    let is_from_treasury = src_gen.is_treasury;
    let is_src_intermediary = src_gen.is_intermediary;
    let is_dst_intermediary = dst_gen.is_intermediary;
    let is_to_vault =
        is_registered_vault(&ctx.accounts.vault_entry, config.merchant, dst_owner)?;
    let is_dex_involved = src_gen.is_dex_pool || dst_gen.is_dex_pool;

    // TREASURY TRANSFER (Commission payout)
    if is_from_treasury {
        let entry = InboundEntry {
            referrer: Pubkey::default(),
            amount,
            generation_source: GenSource::Issuance,
            slot: Clock::get()?.slot,
            processed: false,
            _padding: [0u8; 7],
        };
        if write_inbound(dst_gen, entry).is_ok() {
            dst_gen.gen1_balance =
                checked_add(dst_gen.gen1_balance, amount, ViralSyncError::MathOverflow)?;
        } else {
            dst_gen.dead_balance =
                checked_add(dst_gen.dead_balance, amount, ViralSyncError::MathOverflow)?;
        }
        return Ok(());
    }

    // DEX TRANSFER
    if is_dex_involved {
        if !is_src_intermediary && !is_from_merchant {
            fifo_deduct(src_gen, amount)?;
        }
        if !dst_gen.is_dex_pool && !is_dst_intermediary {
            dst_gen.dead_balance =
                checked_add(dst_gen.dead_balance, amount, ViralSyncError::MathOverflow)?;
            emit!(DexTransferDetected {
                from: src_owner,
                to: dst_owner,
                amount,
            });
        }
        return Ok(());
    }

    // EXPIRY CHECK
    if !is_from_merchant && !is_src_intermediary && config.token_expiry_days > 0 && src_gen.first_received_at > 0 {
        let age_days = (Clock::get()?
            .unix_timestamp
            .saturating_sub(src_gen.first_received_at))
            / 86_400;
        require!(
            age_days <= config.token_expiry_days as i64,
            ViralSyncError::TokensExpired
        );
    }

    // REDEMPTION PATH
    if is_to_vault && !is_from_merchant {
        require!(
            src_gen.buffer_pending == 0,
            ViralSyncError::MustFinalizeBeforeRedeem
        );
        require!(
            !src_gen.redemption_pending,
            ViralSyncError::PreviousRedemptionUnprocessed
        );
        require!(
            src_gen.active_referrer_slots <= 4,
            ViralSyncError::InvalidReferrerSlot
        );

        let gen2_consumed = fifo_deduct_redemption(src_gen, amount)?;

        src_gen.redemption_pending = true;
        src_gen.redemption_slot = Clock::get()?.slot;
        src_gen.redemption_gen2_consumed = gen2_consumed;
        src_gen.redemption_slots_settled = 0;
        src_gen.redemption_slot_consumed = [0; 4];

        let total_gen2_before = src_gen
            .gen2_balance
            .checked_add(gen2_consumed)
            .ok_or(ViralSyncError::MathOverflow)?;
        for i in 0..src_gen.active_referrer_slots as usize {
            if src_gen.referrer_slots[i].is_active && total_gen2_before > 0 {
                src_gen.redemption_slot_consumed[i] = gen2_consumed
                    .checked_mul(src_gen.referrer_slots[i].tokens_attributed)
                    .ok_or(ViralSyncError::MathOverflow)?
                    .checked_div(total_gen2_before)
                    .ok_or(ViralSyncError::MathOverflow)?;
            }
        }

        emit!(RedemptionDetected {
            redeemer: src_owner,
            amount,
            gen2_consumed,
            slot: Clock::get()?.slot,
        });
        return Ok(());
    }

    // ISSUANCE PATH
    if is_from_merchant {
        let entry = InboundEntry {
            referrer: Pubkey::default(),
            amount,
            generation_source: GenSource::Issuance,
            slot: Clock::get()?.slot,
            processed: false,
            _padding: [0u8; 7],
        };
        if write_inbound(dst_gen, entry).is_ok() {
            dst_gen.gen1_balance =
                checked_add(dst_gen.gen1_balance, amount, ViralSyncError::MathOverflow)?;
        } else {
            dst_gen.dead_balance =
                checked_add(dst_gen.dead_balance, amount, ViralSyncError::MathOverflow)?;
        }
        if dst_gen.first_received_at == 0 {
            dst_gen.first_received_at = Clock::get()?.unix_timestamp;
        }
        dst_gen.last_received_at = Clock::get()?.unix_timestamp;
        return Ok(());
    }

    // INTERMEDIARY ESCROW RELEASE
    if is_src_intermediary {
        let effective_referrer = src_gen.original_sender;
        if !is_dst_intermediary {
            let entry_type = if effective_referrer != Pubkey::default() {
                GenSource::ViralShare
            } else {
                GenSource::DeadPass
            };
            let entry = InboundEntry {
                referrer: effective_referrer,
                amount,
                generation_source: entry_type,
                slot: Clock::get()?.slot,
                processed: false,
                _padding: [0u8; 7],
            };
            if write_inbound(dst_gen, entry).is_ok() {
                match entry_type {
                    GenSource::ViralShare => {
                        dst_gen.gen2_balance = checked_add(
                            dst_gen.gen2_balance,
                            amount,
                            ViralSyncError::MathOverflow,
                        )?
                    }
                    _ => {
                        dst_gen.dead_balance = checked_add(
                            dst_gen.dead_balance,
                            amount,
                            ViralSyncError::MathOverflow,
                        )?
                    }
                }
            } else {
                dst_gen.dead_balance =
                    checked_add(dst_gen.dead_balance, amount, ViralSyncError::MathOverflow)?;
            }
            if dst_gen.first_received_at == 0 {
                dst_gen.first_received_at = Clock::get()?.unix_timestamp;
            }
            dst_gen.last_received_at = Clock::get()?.unix_timestamp;
        }
        return Ok(());
    }

    // PEER TRANSFER
    let held_secs = Clock::get()?
        .unix_timestamp
        .saturating_sub(src_gen.first_received_at);
    require!(
        held_secs >= config.min_hold_before_share_secs,
        ViralSyncError::HoldPeriodNotMet
    );
    require!(
        amount >= config.min_tokens_per_referral,
        ViralSyncError::BelowMinimum
    );
    require!(
        amount <= config.max_tokens_per_referral,
        ViralSyncError::ExceedsMaximum
    );

    let today_index = Clock::get()?.slot / config.slots_per_day.max(1);
    if src_gen.share_limit_day == today_index {
        require!(
            src_gen.shares_today < config.max_referrals_per_wallet_per_day,
            ViralSyncError::DailyShareLimitExceeded
        );
        src_gen.shares_today = src_gen
            .shares_today
            .checked_add(1)
            .ok_or(ViralSyncError::MathOverflow)?;
    } else {
        src_gen.share_limit_day = today_index;
        src_gen.shares_today = 1;
    }

    if src_gen.gen1_balance == 0 && !config.allow_second_gen_transfer {
        return Err(ViralSyncError::MaxDepthReached.into());
    }

    let (from_gen1, from_gen2, _from_dead) = deduct_with_breakdown(src_gen, amount)?;
    let (entry_type, effective_referrer) = if from_gen1 > 0 {
        (GenSource::ViralShare, src_owner)
    } else if from_gen2 > 0 {
        if config.allow_second_gen_transfer {
            (GenSource::DeadPass, Pubkey::default())
        } else {
            return Err(ViralSyncError::MaxDepthReached.into());
        }
    } else {
        (GenSource::DeadPass, Pubkey::default())
    };

    if !is_dst_intermediary {
        let entry = InboundEntry {
            referrer: effective_referrer,
            amount,
            generation_source: entry_type,
            slot: Clock::get()?.slot,
            processed: false,
            _padding: [0u8; 7],
        };
        if write_inbound(dst_gen, entry).is_ok() {
            match entry_type {
                GenSource::ViralShare => {
                    dst_gen.gen2_balance =
                        checked_add(dst_gen.gen2_balance, amount, ViralSyncError::MathOverflow)?
                }
                _ => {
                    dst_gen.dead_balance =
                        checked_add(dst_gen.dead_balance, amount, ViralSyncError::MathOverflow)?
                }
            }
        } else {
            dst_gen.dead_balance =
                checked_add(dst_gen.dead_balance, amount, ViralSyncError::MathOverflow)?;
        }
        if dst_gen.first_received_at == 0 {
            dst_gen.first_received_at = Clock::get()?.unix_timestamp;
        }
        dst_gen.last_received_at = Clock::get()?.unix_timestamp;
    }

    emit!(TransferExecuted {
        from: src_owner,
        to: dst_owner,
        effective_referrer,
        amount,
        entry_type,
        slot: Clock::get()?.slot,
    });

    Ok(())
}

fn read_owner_from_token_account(account: &UncheckedAccount) -> Result<Pubkey> {
    require!(
        account.owner == &TOKEN_2022_PROGRAM_ID || account.owner == &TOKEN_PROGRAM_ID,
        ViralSyncError::InvalidTokenAccount
    );
    let data = account.try_borrow_data()?;
    require!(data.len() >= 64, ViralSyncError::InvalidTokenAccount);
    let owner_bytes: [u8; 32] = data[32..64]
        .try_into()
        .map_err(|_| error!(ViralSyncError::InvalidTokenAccount))?;
    Ok(Pubkey::new_from_array(owner_bytes))
}

fn is_registered_vault(
    vault_account: &UncheckedAccount,
    merchant: Pubkey,
    expected_vault_owner: Pubkey,
) -> Result<bool> {
    if vault_account.lamports() == 0 || vault_account.data_is_empty() {
        return Ok(false);
    }
    if vault_account.owner != &crate::id() {
        return Ok(false);
    }

    let mut data: &[u8] = &vault_account.try_borrow_data()?;
    let Ok(vault_entry) = VaultEntry::try_deserialize(&mut data) else {
        return Ok(false);
    };

    Ok(vault_entry.is_active
        && vault_entry.merchant == merchant
        && vault_entry.vault == expected_vault_owner)
}

fn write_inbound(gen: &mut TokenGeneration, entry: InboundEntry) -> Result<()> {
    if gen.buffer_pending >= INBOUND_BUFFER_SIZE as u8 {
        emit!(InboundBufferOverflow {
            recipient: gen.owner,
            amount: entry.amount,
            sender: entry.referrer,
        });
        return Err(ViralSyncError::InboundBufferOverflow.into());
    }
    let idx = gen.buffer_head as usize;
    gen.inbound_buffer[idx] = entry;
    gen.buffer_head = (gen.buffer_head + 1) % (INBOUND_BUFFER_SIZE as u8);
    gen.buffer_pending = gen
        .buffer_pending
        .checked_add(1)
        .ok_or(ViralSyncError::MathOverflow)?;
    Ok(())
}

fn checked_add(a: u64, b: u64, err: ViralSyncError) -> Result<u64> {
    a.checked_add(b).ok_or(err.into())
}

fn total_balance(gen: &TokenGeneration) -> u128 {
    gen.gen1_balance as u128 + gen.gen2_balance as u128 + gen.dead_balance as u128
}

fn deduct_with_breakdown(gen: &mut TokenGeneration, amount: u64) -> Result<(u64, u64, u64)> {
    require!(
        total_balance(gen) >= amount as u128,
        ViralSyncError::InsufficientBalance
    );
    let from_gen1 = amount.min(gen.gen1_balance);
    let from_gen2 = (amount - from_gen1).min(gen.gen2_balance);
    let from_dead = amount - from_gen1 - from_gen2;

    gen.gen1_balance = gen
        .gen1_balance
        .checked_sub(from_gen1)
        .ok_or(ViralSyncError::MathOverflow)?;
    gen.gen2_balance = gen
        .gen2_balance
        .checked_sub(from_gen2)
        .ok_or(ViralSyncError::MathOverflow)?;
    gen.dead_balance = gen
        .dead_balance
        .checked_sub(from_dead)
        .ok_or(ViralSyncError::MathOverflow)?;

    Ok((from_gen1, from_gen2, from_dead))
}

fn fifo_deduct(gen: &mut TokenGeneration, amount: u64) -> Result<()> {
    let _ = deduct_with_breakdown(gen, amount)?;
    Ok(())
}

fn fifo_deduct_redemption(gen: &mut TokenGeneration, amount: u64) -> Result<u64> {
    let (_, from_gen2, _) = deduct_with_breakdown(gen, amount)?;
    Ok(from_gen2)
}
