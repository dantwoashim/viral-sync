# State Compression Exploration

## Context

The largest per-user account footprint in the protocol comes from inbound referral state and referrer tracking. At scale, this increases rent overhead for onboarding.

## Goal

Reduce per-user storage while preserving deterministic attribution and auditability.

## Candidate Approach

Use SPL account compression to externalize heavy referral state into a Merkle structure while keeping core balances in compact user PDAs.

Potential model:
1. Keep compact balances and pointers in `TokenGeneration`
2. Store high-volume referral state in compressed leaves
3. Verify updates through proof-based settlement instructions

## Constraints

- Transfer hook compute limits require lightweight synchronous logic
- Proof verification must be bounded and predictable
- Relayer/indexer responsibilities must remain explicit and auditable

## Practical Path

- Keep transfer hook focused on validation + minimal state transitions
- Move expensive reconciliation work into asynchronous maintenance instructions
- Add clear failure handling for delayed or missing proof updates

## Tradeoffs

Pros:
- Lower rent footprint per active user
- Better scalability for long referral chains

Cons:
- More off-chain coordination complexity
- Additional proof lifecycle and monitoring requirements

## Status

This is a design direction for future optimization and should be implemented only with full benchmark coverage and deterministic reconciliation tests.
