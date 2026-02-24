/**
 * Relayer Client
 * Sends transactions to the gas relayer instead of directly to Solana.
 * The relayer pays the gas fee so users never need SOL.
 *
 * Flow:
 * 1. Frontend builds transaction (unsigned or partially signed by session key)
 * 2. Serializes to base64 and sends to relayer
 * 3. Relayer simulates, co-signs (adds fee payer), broadcasts
 * 4. Returns transaction signature
 */

import {
    PublicKey,
    Transaction,
    TransactionInstruction,
    VersionedTransaction,
} from '@solana/web3.js';
import { getConnection } from './solana';

const RELAYER_URL = process.env.NEXT_PUBLIC_RELAYER_URL || 'http://localhost:3001';
const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

export interface RelayResult {
    success: boolean;
    signature?: string;
    error?: string;
    logs?: string[];
    attempts?: number;
    recoverable?: boolean;
}

export interface RelayRetryOptions {
    maxAttempts?: number;
    baseDelayMs?: number;
}

export interface ConfirmResult {
    success: boolean;
    signature: string;
    error?: string;
}

export type SponsoredActionKind = 'claim_referral' | 'redeem_purchase' | 'pos_ack';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function serializeForRelay(tx: Transaction | VersionedTransaction): Uint8Array {
    if (tx instanceof Transaction) {
        // Legacy transactions are built client-side without relayer signature.
        // Allow serialization so the relayer can co-sign as fee payer.
        return tx.serialize({ requireAllSignatures: false, verifySignatures: false });
    }
    return tx.serialize();
}

/**
 * Send a transaction through the gas relayer.
 * The relayer pays the SOL transaction fee.
 */
export async function relayTransaction(
    tx: Transaction | VersionedTransaction
): Promise<RelayResult> {
    try {
        const serialized = serializeForRelay(tx);
        const base64 = Buffer.from(serialized).toString('base64');

        const response = await fetch(`${RELAYER_URL}/relay`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transactionBase64: base64 }),
        });

        let data: {
            signature?: string;
            error?: string;
            logs?: string[];
        } = {};
        try {
            data = await response.json();
        } catch {
            data = {};
        }

        if (!response.ok) {
            return {
                success: false,
                error: data.error || 'Relay failed',
                logs: data.logs,
            };
        }

        return {
            success: true,
            signature: data.signature,
            attempts: 1,
        };
    } catch (error: unknown) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Network error — relayer may be offline',
            attempts: 1,
            recoverable: true,
        };
    }
}

export async function relayTransactionWithRetry(
    tx: Transaction | VersionedTransaction,
    options: RelayRetryOptions = {}
): Promise<RelayResult> {
    const maxAttempts = Math.max(1, options.maxAttempts ?? 3);
    const baseDelayMs = Math.max(100, options.baseDelayMs ?? 600);
    let lastFailure: RelayResult | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const result = await relayTransaction(tx);
        if (result.success) {
            return { ...result, attempts: attempt };
        }

        lastFailure = { ...result, attempts: attempt, recoverable: attempt < maxAttempts };
        if (attempt < maxAttempts) {
            const jitter = Math.floor(Math.random() * 220);
            await sleep(baseDelayMs * attempt + jitter);
        }
    }

    return lastFailure ?? {
        success: false,
        error: 'Relay failed with no response',
        attempts: maxAttempts,
        recoverable: false,
    };
}

/**
 * Check if the relayer is online and healthy.
 */
export async function checkRelayerHealth(): Promise<{
    online: boolean;
    relayerPubkey?: string;
    balance?: number;
}> {
    try {
        const response = await fetch(`${RELAYER_URL}/health`, {
            method: 'GET',
            signal: AbortSignal.timeout(3000),
        });

        if (!response.ok) {
            return { online: false };
        }

        const data = await response.json();
        return {
            online: true,
            relayerPubkey: data.relayerPubkey,
            balance: data.balance,
        };
    } catch {
        return { online: false };
    }
}

export async function checkRelayerHealthWithRetry(maxAttempts = 2): Promise<{
    online: boolean;
    relayerPubkey?: string;
    balance?: number;
}> {
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const health = await checkRelayerHealth();
        if (health.online) {
            return health;
        }
        if (attempt < maxAttempts) {
            await sleep(350 * attempt);
        }
    }
    return { online: false };
}

function buildMemoPayload(args: {
    kind: SponsoredActionKind;
    merchant: string;
    consumer: string;
    referrer?: string;
    context?: string;
}): string {
    const payload = {
        app: 'viral-sync',
        v: 1,
        ...args,
        ts: Date.now(),
    };
    const json = JSON.stringify(payload);
    return json.length > 760 ? `${json.slice(0, 760)}...` : json;
}

export async function buildSponsoredActionTx(args: {
    kind: SponsoredActionKind;
    relayerPubkey: PublicKey;
    merchant: string;
    consumer: string;
    referrer?: string;
    context?: string;
}): Promise<Transaction> {
    const conn = getConnection();
    const { blockhash } = await conn.getLatestBlockhash('confirmed');

    const tx = new Transaction();
    tx.recentBlockhash = blockhash;
    tx.feePayer = args.relayerPubkey;

    const memo = buildMemoPayload({
        kind: args.kind,
        merchant: args.merchant,
        consumer: args.consumer,
        referrer: args.referrer,
        context: args.context,
    });

    tx.add(new TransactionInstruction({
        keys: [],
        programId: MEMO_PROGRAM_ID,
        data: Buffer.from(memo, 'utf8'),
    }));

    return tx;
}

export async function confirmSignature(
    signature: string,
    timeoutMs = 30_000
): Promise<ConfirmResult> {
    const conn = getConnection();
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
        const status = await conn.getSignatureStatus(signature, { searchTransactionHistory: true });
        const value = status.value;

        if (value?.confirmationStatus === 'confirmed' || value?.confirmationStatus === 'finalized') {
            return { success: true, signature };
        }

        if (value?.err) {
            return {
                success: false,
                signature,
                error: JSON.stringify(value.err),
            };
        }

        await sleep(1200);
    }

    return {
        success: false,
        signature,
        error: 'Confirmation timeout',
    };
}

/**
 * Get the relayer's public key and current SOL balance.
 * Useful for displaying relayer status in merchant settings.
 */
export function getRelayerUrl(): string {
    return RELAYER_URL;
}
