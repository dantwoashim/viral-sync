# Viral Sync Architecture

## Overview

Viral Sync is a Solana-native referral and loyalty protocol built with Token-2022 transfer hooks.

Core objectives:
- Deterministic attribution for referral-driven transactions
- Fraud-aware merchant controls with transparent on-chain state
- Low-friction user experience through relayer-sponsored transactions

## Core Data Model

- `MerchantConfig`: commission settings, token lifecycle controls, supply tracking
- `TokenGeneration`: per-user token balances plus inbound processing state
- `CommissionLedger`: accrued and claimable referral commissions
- `ViralOracle`: derived conversion and growth metrics
- `MerchantReputation`: trust, suspicion, and operational health scores
- `MerchantBond` / `DisputeRecord`: enforcement and dispute resolution state

## Transfer and Attribution Flow

1. A token transfer triggers the transfer hook
2. The hook classifies inbound balances and records attribution context
3. Buffer finalization resolves queued inbound entries
4. Redemption instructions consume balances and credit commission ledgers
5. Oracle updates compute growth metrics from on-chain activity

## Security and Reliability Controls

- Inbound ring buffer prevents referral-path failures under burst traffic
- Bounded referrer slots keep compute predictable
- Bond-backed dispute process creates economic accountability
- Session key support enables short-lived delegated signing for relayed UX

## Off-Chain Services

- Frontend app: merchant analytics + consumer flows
- Relayer: simulation + sponsored transaction broadcast
- Cranks: periodic maintenance and deterministic cleanup jobs
- POS tooling: redemption payload generation for in-store use

## UX Surface

Merchant routes:
- `/launchpad`
- `/`
- `/oracle`
- `/network`
- `/disputes`
- `/settings`

Consumer routes:
- `/consumer`
- `/consumer/earn`
- `/consumer/scan`
- `/consumer/profile`

## Deployment Notes

- Program and account schemas should remain synchronized with frontend PDA helpers
- Relayer must always simulate transactions before broadcast
- Oracle metrics should be computed from trusted, reproducible data pipelines
