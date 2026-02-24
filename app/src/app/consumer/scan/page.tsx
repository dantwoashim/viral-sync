'use client';

import React, { useMemo, useState } from 'react';
import {
    QrCode,
    Camera,
    Zap,
    CheckCircle,
    XCircle,
    LoaderCircle,
    ArrowRight,
    RefreshCcw,
    Link2,
} from 'lucide-react';
import Link from 'next/link';
import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@/lib/useWallet';
import { explorerUrl, MERCHANT_PUBKEY, shortenAddress } from '@/lib/solana';
import {
    buildSponsoredActionTx,
    checkRelayerHealthWithRetry,
    confirmSignature,
    relayTransactionWithRetry,
} from '@/lib/relayer';

type ScanState = 'idle' | 'processing' | 'success' | 'error';
type IntentMode = 'claim_referral' | 'redeem_purchase';
type TimelineStatus = 'pending' | 'active' | 'success' | 'error';
type TimelineStepId = 'intent' | 'relayer' | 'submitted' | 'simulated' | 'confirmed';

type TimelineStep = {
    id: TimelineStepId;
    label: string;
    status: TimelineStatus;
    detail: string;
};

type TxIntent = {
    kind: IntentMode;
    merchant: string;
    consumer: string;
    referrer?: string;
    context: string;
    summary: string;
};

const REFERRER_STORAGE_KEY = 'vs-active-referrer';
const POS_PAYLOAD_TYPE = 'viral-sync-pos';

function isValidAddress(value: string | null | undefined): value is string {
    return Boolean(value && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value));
}

function buildInitialTimeline(mode: IntentMode): TimelineStep[] {
    return [
        {
            id: 'intent',
            label: 'Intent',
            status: 'pending',
            detail: mode === 'claim_referral' ? 'Parse referral + merchant context' : 'Parse POS payload + merchant',
        },
        { id: 'relayer', label: 'Relayer', status: 'pending', detail: 'Check relayer health and balance' },
        { id: 'submitted', label: 'Submitted', status: 'pending', detail: 'Push transaction to relayer' },
        { id: 'simulated', label: 'Simulated', status: 'pending', detail: 'Relayer simulation result' },
        { id: 'confirmed', label: 'Confirmed', status: 'pending', detail: 'On-chain confirmation' },
    ];
}

function parseClaimIntent(rawInput: string, consumer: string): { intent?: TxIntent; error?: string } {
    const trimmed = rawInput.trim();
    if (!trimmed) {
        return { error: 'Enter a referral URL or referrer wallet address.' };
    }

    let referrer: string | null = null;
    let merchant: string | null = MERCHANT_PUBKEY?.toBase58() ?? null;

    try {
        const url = new URL(trimmed);
        const refFromUrl = url.searchParams.get('ref');
        const merchantFromUrl = url.searchParams.get('merchant');
        if (isValidAddress(refFromUrl)) referrer = refFromUrl;
        if (isValidAddress(merchantFromUrl)) merchant = merchantFromUrl;
    } catch {
        // Not a URL; continue with raw-value parsing.
    }

    if (!referrer && isValidAddress(trimmed)) {
        referrer = trimmed;
    }

    if (!referrer) {
        return { error: 'Referral code is invalid. Use a referral link or referrer wallet.' };
    }

    if (!merchant) {
        return { error: 'Merchant context missing. Use a referral URL with merchant or set NEXT_PUBLIC_MERCHANT_PUBKEY.' };
    }

    return {
        intent: {
            kind: 'claim_referral',
            merchant,
            consumer,
            referrer,
            context: 'consumer-scan-claim',
            summary: `Claim referral from ${shortenAddress(referrer)}`,
        },
    };
}

function parseRedeemIntent(rawInput: string, consumer: string): { intent?: TxIntent; error?: string } {
    const trimmed = rawInput.trim();
    if (!trimmed) {
        return { error: 'Enter a POS payload JSON or merchant wallet address.' };
    }

    let merchant: string | null = null;
    let context = 'consumer-scan-redeem';

    try {
        const parsed = JSON.parse(trimmed) as {
            type?: string;
            merchant?: string;
            ts?: number;
            expiresAt?: number;
        };
        if (parsed.type === POS_PAYLOAD_TYPE && isValidAddress(parsed.merchant)) {
            merchant = parsed.merchant;
            if (typeof parsed.expiresAt === 'number' && Math.floor(Date.now() / 1000) > parsed.expiresAt) {
                return { error: 'POS QR expired. Ask merchant to refresh and scan again.' };
            }
            context = `pos-qr:${parsed.ts ?? Date.now()}`;
        }
    } catch {
        // Not JSON payload; continue.
    }

    if (!merchant) {
        try {
            const url = new URL(trimmed);
            const merchantFromUrl = url.searchParams.get('merchant');
            if (isValidAddress(merchantFromUrl)) {
                merchant = merchantFromUrl;
            }
        } catch {
            // Not a URL.
        }
    }

    if (!merchant && isValidAddress(trimmed)) {
        merchant = trimmed;
    }

    if (!merchant && MERCHANT_PUBKEY) {
        merchant = MERCHANT_PUBKEY.toBase58();
    }

    if (!merchant) {
        return { error: 'Merchant value is invalid. Use a POS payload or merchant wallet address.' };
    }

    return {
        intent: {
            kind: 'redeem_purchase',
            merchant,
            consumer,
            context,
            summary: `Redeem at ${shortenAddress(merchant)}`,
        },
    };
}

export default function ScanPage() {
    const publicKey = useWallet();
    const [mode, setMode] = useState<IntentMode>('claim_referral');
    const [state, setState] = useState<ScanState>('idle');
    const [inputCode, setInputCode] = useState('');
    const [statusNote, setStatusNote] = useState('Pick intent mode and process your transaction.');
    const [timeline, setTimeline] = useState<TimelineStep[]>(() => buildInitialTimeline('claim_referral'));
    const [signature, setSignature] = useState<string | null>(null);
    const [lastIntent, setLastIntent] = useState<TxIntent | null>(null);

    const placeholder = useMemo(
        () => mode === 'claim_referral'
            ? 'Paste referral URL or referrer wallet'
            : 'Paste POS payload JSON or merchant wallet',
        [mode]
    );

    const updateStep = (id: TimelineStepId, status: TimelineStatus, detail?: string) => {
        setTimeline((prev) =>
            prev.map((step) => (
                step.id === id
                    ? { ...step, status, detail: detail ?? step.detail }
                    : step
            )));
    };

    const resetTimeline = (nextMode: IntentMode) => {
        setTimeline(buildInitialTimeline(nextMode));
        setSignature(null);
    };

    const executeIntent = async (intent: TxIntent) => {
        setLastIntent(intent);
        setState('processing');
        setStatusNote(intent.summary);
        setSignature(null);
        setTimeline(
            buildInitialTimeline(intent.kind).map((step) => (
                step.id === 'intent'
                    ? { ...step, status: 'active', detail: 'Building sponsored transaction' }
                    : step
            ))
        );
        updateStep('intent', 'success', intent.summary);

        let relayerPubkey = '';
        try {
            const health = await checkRelayerHealthWithRetry(3);
            if (!health.online || !health.relayerPubkey) {
                updateStep('relayer', 'error', 'Relayer offline');
                setState('error');
                setStatusNote('Relayer is offline. Retry after service recovery.');
                return;
            }

            relayerPubkey = health.relayerPubkey;
            updateStep('relayer', 'success', `Online ${shortenAddress(relayerPubkey)}`);
        } catch {
            updateStep('relayer', 'error', 'Relayer health check failed');
            setState('error');
            setStatusNote('Unable to reach relayer. Check network and retry.');
            return;
        }

        let tx;
        try {
            tx = await buildSponsoredActionTx({
                kind: intent.kind,
                relayerPubkey: new PublicKey(relayerPubkey),
                merchant: intent.merchant,
                consumer: intent.consumer,
                referrer: intent.referrer,
                context: intent.context,
            });
        } catch {
            updateStep('submitted', 'error', 'Failed to build transaction');
            setState('error');
            setStatusNote('Transaction construction failed. Verify merchant/referrer payload.');
            return;
        }

        updateStep('submitted', 'active', 'Submitting transaction to relayer');
        const relay = await relayTransactionWithRetry(tx, { maxAttempts: 3, baseDelayMs: 700 });
        if (!relay.success || !relay.signature) {
            updateStep('submitted', 'error', relay.error || 'Relayer rejected transaction');
            updateStep('simulated', 'error', relay.logs?.join(' | ') || 'Simulation failed before broadcast');
            setState('error');
            setStatusNote(`Request failed after ${relay.attempts ?? 1} attempt(s).`);
            return;
        }

        updateStep('submitted', 'success', `Broadcasted in ${relay.attempts ?? 1} attempt(s)`);
        updateStep('simulated', 'success', 'Relayer simulation passed');
        updateStep('confirmed', 'active', 'Waiting for final confirmation');
        setSignature(relay.signature);

        const confirmation = await confirmSignature(relay.signature, 45_000);
        if (!confirmation.success) {
            updateStep('confirmed', 'error', confirmation.error || 'Confirmation timeout');
            setState('error');
            setStatusNote('Transaction submitted but confirmation timed out. Retry or inspect explorer.');
            return;
        }

        updateStep('confirmed', 'success', shortenAddress(confirmation.signature, 6));
        if (intent.kind === 'claim_referral' && intent.referrer) {
            localStorage.setItem(REFERRER_STORAGE_KEY, intent.referrer);
        }
        setState('success');
        setStatusNote(intent.kind === 'claim_referral'
            ? 'Referral claim confirmed on-chain.'
            : 'Redeem transaction confirmed on-chain.');
    };

    const handleProcess = async () => {
        if (state === 'processing') {
            return;
        }
        if (!publicKey) {
            setState('error');
            setStatusNote('Connect your wallet first to process intents.');
            setTimeline(
                buildInitialTimeline(mode).map((step) => (
                    step.id === 'intent'
                        ? { ...step, status: 'error', detail: 'Wallet missing' }
                        : step
                ))
            );
            return;
        }

        const consumer = publicKey.toBase58();
        const parsed = mode === 'claim_referral'
            ? parseClaimIntent(inputCode, consumer)
            : parseRedeemIntent(inputCode, consumer);

        if (!parsed.intent) {
            setState('error');
            setStatusNote(parsed.error || 'Invalid payload.');
            setSignature(null);
            setTimeline(
                buildInitialTimeline(mode).map((step) => (
                    step.id === 'intent'
                        ? { ...step, status: 'error', detail: parsed.error || 'Payload parsing failed' }
                        : step
                ))
            );
            return;
        }

        await executeIntent(parsed.intent);
    };

    const handleRetry = async () => {
        if (!lastIntent || state === 'processing') {
            return;
        }
        await executeIntent(lastIntent);
    };

    const renderTimelineIcon = (status: TimelineStatus) => {
        if (status === 'success') return <CheckCircle size={14} color="var(--jade)" />;
        if (status === 'error') return <XCircle size={14} color="var(--crimson)" />;
        if (status === 'active') return <LoaderCircle size={14} color="var(--gold)" className="spin-slow" />;
        return <Camera size={14} color="var(--text-3)" />;
    };

    const modeTitle = mode === 'claim_referral' ? 'Claim Referral' : 'Redeem Purchase';
    const processDisabled = state === 'processing' || !inputCode.trim();

    return (
        <>
            <div className="page-top">
                <h1>Scan</h1>
                {publicKey && <div className="pill pill-gold">{shortenAddress(publicKey.toBase58())}</div>}
            </div>

            <div className="page-scroll">
                <div className="scroll-card" style={{ padding: 'var(--s5)', marginBottom: 'var(--s4)' }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--s4)' }}>
                        <button
                            onClick={() => {
                                setMode('claim_referral');
                                resetTimeline('claim_referral');
                                setState('idle');
                                setInputCode('');
                                setStatusNote('Process a referral claim transaction.');
                            }}
                            style={{
                                flex: 1,
                                padding: '10px 12px',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border)',
                                background: mode === 'claim_referral' ? 'var(--gold-soft)' : 'var(--mist)',
                                color: mode === 'claim_referral' ? 'var(--gold)' : 'var(--text-2)',
                                fontWeight: 700,
                                fontSize: 12,
                            }}
                        >
                            Claim Intent
                        </button>
                        <button
                            onClick={() => {
                                setMode('redeem_purchase');
                                resetTimeline('redeem_purchase');
                                setState('idle');
                                setInputCode('');
                                setStatusNote('Process a redeem transaction from POS.');
                            }}
                            style={{
                                flex: 1,
                                padding: '10px 12px',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border)',
                                background: mode === 'redeem_purchase' ? 'var(--jade-soft)' : 'var(--mist)',
                                color: mode === 'redeem_purchase' ? 'var(--jade)' : 'var(--text-2)',
                                fontWeight: 700,
                                fontSize: 12,
                            }}
                        >
                            Redeem Intent
                        </button>
                    </div>

                    <div
                        style={{
                            width: 132,
                            height: 132,
                            borderRadius: '50%',
                            border: `2px solid ${state === 'success' ? 'var(--jade)' : state === 'error' ? 'var(--crimson)' : 'var(--gold)'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto var(--s4)',
                            boxShadow: state === 'processing'
                                ? '0 0 36px var(--gold-glow)'
                                : '0 0 16px var(--gold-glow)',
                        }}
                    >
                        {state === 'success' ? <CheckCircle size={44} color="var(--jade)" /> :
                            state === 'error' ? <XCircle size={44} color="var(--crimson)" /> :
                                state === 'processing' ? <LoaderCircle size={44} color="var(--gold)" className="spin-slow" /> :
                                    <QrCode size={44} color="var(--gold)" style={{ opacity: 0.6 }} />}
                    </div>

                    <h2 style={{ textAlign: 'center', marginBottom: 4 }}>{modeTitle}</h2>
                    <p style={{ fontSize: 13, color: 'var(--text-2)', textAlign: 'center' }}>{statusNote}</p>
                </div>

                <div className="scroll-card" style={{ padding: 'var(--s5)', marginBottom: 'var(--s4)' }}>
                    <h3 style={{ marginBottom: 'var(--s3)' }}>
                        <Camera size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />
                        Intent Payload
                    </h3>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <input
                            type="text"
                            value={inputCode}
                            onChange={(e) => setInputCode(e.target.value)}
                            placeholder={placeholder}
                            style={{
                                flex: 1,
                                padding: '12px 14px',
                                background: 'var(--mist-strong)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-sm)',
                                color: 'var(--text-1)',
                                fontFamily: 'var(--font-mono)',
                                fontSize: 13,
                                outline: 'none',
                            }}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    void handleProcess();
                                }
                            }}
                        />
                        <button
                            onClick={() => { void handleProcess(); }}
                            disabled={processDisabled}
                            style={{
                                padding: '12px 16px',
                                background: processDisabled
                                    ? 'var(--mist-strong)'
                                    : mode === 'claim_referral'
                                        ? 'linear-gradient(135deg, var(--gold), var(--dawn))'
                                        : 'linear-gradient(135deg, var(--jade), #2D7A60)',
                                color: processDisabled ? 'var(--text-3)' : mode === 'claim_referral' ? 'var(--ink)' : '#fff',
                                borderRadius: 'var(--radius-sm)',
                                fontWeight: 800,
                                fontSize: 13,
                            }}
                        >
                            {state === 'processing' ? '...' : 'Process'}
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginTop: 'var(--s3)' }}>
                        <button
                            onClick={() => { void handleRetry(); }}
                            disabled={!lastIntent || state === 'processing'}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '8px 10px',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border)',
                                background: !lastIntent || state === 'processing' ? 'var(--mist)' : 'var(--mist-strong)',
                                color: !lastIntent || state === 'processing' ? 'var(--text-3)' : 'var(--text-1)',
                                fontSize: 12,
                                fontWeight: 700,
                            }}
                        >
                            <RefreshCcw size={12} /> Retry Last
                        </button>

                        {state === 'success' && mode === 'claim_referral' && (
                            <Link
                                href="/consumer/earn"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '8px 10px',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid var(--border)',
                                    background: 'var(--gold-soft)',
                                    color: 'var(--gold)',
                                    fontSize: 12,
                                    fontWeight: 700,
                                }}
                            >
                                Open Earn <ArrowRight size={12} />
                            </Link>
                        )}
                    </div>
                </div>

                <div className="scroll-card" style={{ padding: 'var(--s4)', marginBottom: 'var(--s4)' }}>
                    <h3 style={{ marginBottom: 'var(--s2)' }}>
                        <Zap size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />
                        Transaction Timeline
                    </h3>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 'var(--s3)' }}>
                        Deterministic checkpoints: intent, relayer, submit, simulate, confirm.
                    </div>
                    <div className="list-card">
                        {timeline.map((step) => (
                            <div key={step.id} className="list-item">
                                <div className="list-item-icon" style={{ background: 'var(--mist)' }}>
                                    {renderTimelineIcon(step.status)}
                                </div>
                                <div className="list-item-content">
                                    <div className="list-item-title">{step.label}</div>
                                    <div className="list-item-sub" style={{ whiteSpace: 'normal' }}>{step.detail}</div>
                                </div>
                                <div className="list-item-right">
                                    <span
                                        className={`pill ${step.status === 'success'
                                            ? 'pill-jade'
                                            : step.status === 'error'
                                                ? 'pill-crimson'
                                                : step.status === 'active'
                                                    ? 'pill-gold'
                                                    : 'pill-cloud'}`}
                                    >
                                        {step.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {signature && (
                        <a
                            href={explorerUrl(signature, 'tx')}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                marginTop: 'var(--s3)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                fontSize: 12,
                                color: 'var(--gold)',
                                fontWeight: 700,
                            }}
                        >
                            <Link2 size={12} /> View Transaction
                        </a>
                    )}
                </div>

                <div className="section">
                    <div className="scroll-card" style={{ padding: 'var(--s4)' }}>
                        <div className="metric-row">
                            <span className="metric-label">Claim Input</span>
                            <span className="metric-value" style={{ fontSize: 12 }}>Referral URL or referrer wallet</span>
                        </div>
                        <div className="metric-row">
                            <span className="metric-label">Redeem Input</span>
                            <span className="metric-value" style={{ fontSize: 12 }}>POS payload JSON or merchant wallet</span>
                        </div>
                        <div className="metric-row">
                            <span className="metric-label">Cost</span>
                            <span className="metric-value" style={{ fontSize: 12 }}>Gasless via relayer</span>
                        </div>
                    </div>
                </div>

                <div style={{ height: 'var(--s8)' }} />
            </div>
        </>
    );
}
