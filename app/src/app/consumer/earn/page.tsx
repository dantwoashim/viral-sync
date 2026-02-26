'use client';

import React from 'react';
import { Share2, Copy, Zap, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/lib/useWallet';
import { useCommissionLedger } from '@/lib/hooks';
import { formatTokenAmount, MERCHANT_PUBKEY, shortenAddress } from '@/lib/solana';

const REFERRER_STORAGE_KEY = 'vs-active-referrer';

function isValidReferrer(value: string | null): value is string {
    return Boolean(value && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value));
}

function EarnPageContent() {
    const router = useRouter();
    const publicKey = useWallet();
    const ledger = useCommissionLedger(publicKey, null);
    const dataError = ledger.error;
    const [copied, setCopied] = React.useState(false);
    const [shared, setShared] = React.useState(false);
    const [refFromQuery, setRefFromQuery] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        const params = new URLSearchParams(window.location.search);
        setRefFromQuery(params.get('ref'));
    }, []);

    React.useEffect(() => {
        if (!isValidReferrer(refFromQuery)) return;
        localStorage.setItem(REFERRER_STORAGE_KEY, refFromQuery);
    }, [refFromQuery]);

    const activeReferrer = React.useMemo(() => {
        if (isValidReferrer(refFromQuery)) return refFromQuery;
        if (typeof window === 'undefined') return null;
        const stored = localStorage.getItem(REFERRER_STORAGE_KEY);
        return isValidReferrer(stored) ? stored : null;
    }, [refFromQuery]);

    const referralLink = React.useMemo(() => {
        if (!publicKey) return 'Connect wallet first';
        const baseUrl =
            process.env.NEXT_PUBLIC_APP_URL ||
            (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
        const params = new URLSearchParams({ ref: publicKey.toBase58() });
        if (MERCHANT_PUBKEY) {
            params.set('merchant', MERCHANT_PUBKEY.toBase58());
        }
        return `${baseUrl.replace(/\/$/, '')}/consumer/earn?${params.toString()}`;
    }, [publicKey]);

    const handleCopy = async () => {
        if (!publicKey) return;
        try {
            await navigator.clipboard.writeText(referralLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    };

    const handleShare = async () => {
        if (!publicKey || typeof navigator === 'undefined' || !navigator.share) return;
        try {
            await navigator.share({
                title: 'Join my Viral Sync referral link',
                text: 'Claim and share rewards with this referral link.',
                url: referralLink,
            });
            setShared(true);
            setTimeout(() => setShared(false), 2000);
        } catch {
            setShared(false);
        }
    };

    const clearReferrer = () => {
        localStorage.removeItem(REFERRER_STORAGE_KEY);
        router.replace('/consumer/earn');
    };

    return (
        <>
            <div className="page-top">
                <h1>Earn</h1>
                {ledger.data && <div className="pill pill-gold"><Zap size={11} /> {formatTokenAmount(ledger.data.totalEarned)}</div>}
            </div>

            <div className="page-scroll">
                {dataError && (
                    <div className="scroll-card" style={{ padding: 'var(--s4)', marginBottom: 'var(--s4)', borderColor: 'var(--crimson-soft)' }}>
                        <div style={{ fontSize: 13, color: 'var(--crimson)' }}>
                            Unable to load referral ledger: {dataError}
                        </div>
                    </div>
                )}

                {activeReferrer && (
                    <div className="scroll-card" style={{ padding: 'var(--s4)', marginBottom: 'var(--s4)' }}>
                        <div className="metric-row">
                            <span className="metric-label">Active Referrer</span>
                            <span className="metric-value">{shortenAddress(activeReferrer)}</span>
                        </div>
                        <p style={{ marginTop: 8, fontSize: 12, color: 'var(--text-2)' }}>
                            New redemptions will attribute commission to this referrer chain.
                        </p>
                        <button
                            onClick={clearReferrer}
                            style={{
                                marginTop: 10,
                                padding: '8px 12px',
                                borderRadius: 'var(--radius-sm)',
                                background: 'var(--mist)',
                                border: '1px solid var(--border)',
                                fontSize: 12,
                                fontWeight: 700,
                            }}
                        >
                            Clear referral context
                        </button>
                    </div>
                )}

                {/* Share Link */}
                <div className="scroll-card" style={{ padding: 'var(--s5)' }}>
                    <h3 style={{ marginBottom: 'var(--s2)' }}>
                        <Share2 size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />
                        Your Referral Link
                    </h3>
                    <div style={{ display: 'flex', gap: 8, marginTop: 'var(--s3)' }}>
                        <div style={{ flex: 1, padding: '10px 14px', background: 'var(--mist-strong)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {referralLink}
                        </div>
                        <button
                            onClick={handleCopy}
                            disabled={!publicKey}
                            style={{ padding: '10px 14px', background: 'var(--gold-soft)', color: 'var(--gold)', borderRadius: 'var(--radius-sm)', fontWeight: 700 }}
                            aria-label="Copy referral link"
                        >
                            {copied ? 'Copied' : <Copy size={14} />}
                        </button>
                        <button
                            onClick={handleShare}
                            disabled={!publicKey || typeof navigator === 'undefined' || !navigator.share}
                            style={{ padding: '10px 14px', background: 'var(--jade-soft)', color: 'var(--jade)', borderRadius: 'var(--radius-sm)', fontWeight: 700 }}
                            aria-label="Share referral link"
                        >
                            {shared ? 'Shared' : <Send size={14} />}
                        </button>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 'var(--s3)' }}>
                        Share this link. Earn commission on every purchase your referrals make.
                    </p>
                </div>

                {/* Stats */}
                <div className="stats-grid" style={{ marginTop: 'var(--s4)' }}>
                    <div className="stat-card scroll-card">
                        <div className="stat-label">Total Earned</div>
                        <div className="stat-value" style={{ color: 'var(--gold)' }}>{ledger.data ? formatTokenAmount(ledger.data.totalEarned) : '—'}</div>
                    </div>
                    <div className="stat-card scroll-card">
                        <div className="stat-label">Pending</div>
                        <div className="stat-value" style={{ color: 'var(--jade)' }}>{ledger.data ? formatTokenAmount(ledger.data.claimable) : '—'}</div>
                    </div>
                </div>

                {!publicKey && (
                    <div className="empty-state" style={{ marginTop: 'var(--s6)' }}>
                        <div className="empty-state-icon"><Share2 size={24} color="var(--text-3)" /></div>
                        <h3>Connect to Begin</h3>
                        <p>Link your wallet to generate your referral link and start earning.</p>
                    </div>
                )}

                <div style={{ height: 'var(--s8)' }} />
            </div>
        </>
    );
}

export default function EarnPage() {
    return (
        <React.Suspense
            fallback={
                <>
                    <div className="page-top">
                        <h1>Earn</h1>
                    </div>
                    <div className="page-scroll">
                        <div className="loading-pulse" style={{ height: 120, marginBottom: 8 }} />
                        <div className="loading-pulse" style={{ height: 84 }} />
                    </div>
                </>
            }
        >
            <EarnPageContent />
        </React.Suspense>
    );
}
