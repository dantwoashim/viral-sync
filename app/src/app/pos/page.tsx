'use client';

import React from 'react';
import { Wifi, Home, Zap, Clock, Activity } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useWallet } from '@/lib/useWallet';
import { formatTokenAmount, shortenAddress } from '@/lib/solana';
import { useRecentTransactions } from '@/lib/hooks';
import QRCode from 'qrcode';

const QR_ROTATION_SECS = 30;

function buildPosPayload(walletAddress: string, epochBucket: number): string {
    return JSON.stringify({
        type: 'viral-sync-pos',
        merchant: walletAddress,
        ts: epochBucket * QR_ROTATION_SECS,
        expiresAt: (epochBucket + 1) * QR_ROTATION_SECS,
    });
}

export default function POSPage() {
    const publicKey = useWallet();
    const txs = useRecentTransactions(publicKey, 12);
    const [qrImage, setQrImage] = React.useState<string | null>(null);
    const [secondsLeft, setSecondsLeft] = React.useState(QR_ROTATION_SECS);
    const [nowUnix, setNowUnix] = React.useState(() => Math.floor(Date.now() / 1000));
    const [activeBucket, setActiveBucket] = React.useState(() => Math.floor(Date.now() / QR_ROTATION_SECS));

    const startOfDay = React.useMemo(() => {
        const now = new Date(nowUnix * 1000);
        now.setHours(0, 0, 0, 0);
        return Math.floor(now.getTime() / 1000);
    }, [nowUnix]);

    const todayTxs = (txs.data ?? []).filter((tx) => (tx.timestamp ?? 0) >= startOfDay);
    const successCount = todayTxs.filter((tx) => tx.success).length;
    const failedCount = todayTxs.length - successCount;
    const volume = todayTxs.reduce((sum, tx) => sum + (tx.amount ?? 0), 0);

    React.useEffect(() => {
        let mounted = true;

        const tick = () => {
            const now = Math.floor(Date.now() / 1000);
            const bucket = Math.floor(now / QR_ROTATION_SECS);
            const left = QR_ROTATION_SECS - (now % QR_ROTATION_SECS);
            if (!mounted) {
                return;
            }
            setNowUnix(now);
            setSecondsLeft(left);
            setActiveBucket((current) => (current === bucket ? current : bucket));
        };

        tick();
        const timer = setInterval(() => {
            tick();
        }, 1000);

        return () => {
            mounted = false;
            clearInterval(timer);
        };
    }, []);

    React.useEffect(() => {
        if (!publicKey) {
            setQrImage(null);
            return;
        }

        let mounted = true;
        const payload = buildPosPayload(publicKey.toBase58(), activeBucket);

        const buildQr = async () => {
            try {
                const dataUrl = await QRCode.toDataURL(payload, {
                    margin: 1,
                    width: 280,
                    color: { dark: '#D4A843', light: '#00000000' },
                });
                if (mounted) {
                    setQrImage(dataUrl);
                }
            } catch {
                if (mounted) {
                    setQrImage(null);
                }
            }
        };

        void buildQr();
        return () => {
            mounted = false;
        };
    }, [publicKey, activeBucket]);

    return (
        <div className="pos-screen">
            <div className="pos-header">
                <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-2)' }}>
                    <Home size={16} /> Merchant
                </Link>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-2)' }}>
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="pill pill-jade">● Online</div>
            </div>

            {/* NFC Ring */}
            <div className="pos-nfc-ring">
                {qrImage ? (
                    <Image
                        src={qrImage}
                        alt="POS claim QR"
                        width={150}
                        height={150}
                        style={{ width: 150, height: 150, objectFit: 'contain' }}
                    />
                ) : (
                    <Wifi size={56} color="var(--gold)" style={{ opacity: 0.5 }} />
                )}
            </div>

            <h2 style={{ fontFamily: 'var(--font-serif)', marginBottom: 4 }}>Ready to Scan</h2>
            <p style={{ fontSize: 13, color: 'var(--text-2)', textAlign: 'center', maxWidth: 240 }}>
                Ask customer to scan this rotating POS QR
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>
                QR refreshes in {secondsLeft}s
            </p>

            {publicKey && (
                <div style={{ marginTop: 'var(--s4)', fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                    Terminal: {shortenAddress(publicKey.toBase58())}
                </div>
            )}
            {!publicKey && (
                <div style={{ marginTop: 'var(--s4)', fontSize: 12, color: 'var(--crimson)', textAlign: 'center' }}>
                    Wallet not connected. POS payload generation is disabled.
                </div>
            )}

            {/* Status */}
            <div className="pos-stats">
                <div className="pos-stat">
                    <div className="pos-stat-val" style={{ color: 'var(--jade)' }}>{txs.loading ? '...' : successCount}</div>
                    <div className="pos-stat-label">Today</div>
                </div>
                <div className="pos-stat">
                    <div className="pos-stat-val">{txs.loading ? '...' : failedCount}</div>
                    <div className="pos-stat-label">Failed</div>
                </div>
                <div className="pos-stat">
                    <div className="pos-stat-val" style={{ color: 'var(--gold)' }}>{txs.loading ? '...' : formatTokenAmount(volume)}</div>
                    <div className="pos-stat-label">Tokens</div>
                </div>
            </div>

            {/* Recent scans */}
            <div className="section" style={{ width: '100%', marginTop: 'var(--s6)' }}>
                <div className="section-header"><span className="section-title">Recent Scans</span></div>
                {txs.error ? (
                    <div className="scroll-card" style={{ padding: 'var(--s4)', borderColor: 'var(--crimson-soft)' }}>
                        <div style={{ fontSize: 13, color: 'var(--crimson)' }}>
                            Failed to load recent scans: {txs.error}
                        </div>
                    </div>
                ) : txs.loading ? (
                    <div>
                        <div className="loading-pulse" style={{ height: 52, marginBottom: 4 }} />
                        <div className="loading-pulse" style={{ height: 52 }} />
                    </div>
                ) : todayTxs.length > 0 ? (
                    <div className="list-card">
                        {todayTxs.slice(0, 6).map((tx) => (
                            <div key={tx.signature} className="list-item">
                                <div className="list-item-icon" style={{ background: tx.success ? 'var(--jade-soft)' : 'var(--crimson-soft)', color: tx.success ? 'var(--jade)' : 'var(--crimson)' }}>
                                    <Activity size={16} />
                                </div>
                                <div className="list-item-content">
                                    <div className="list-item-title">{tx.success ? 'Redeem confirmed' : 'Redeem failed'}</div>
                                    <div className="list-item-sub"><Clock size={9} /> {tx.timestamp ? new Date(tx.timestamp * 1000).toLocaleTimeString() : 'Pending'}</div>
                                </div>
                                <div className="list-item-right">
                                    <div className="list-item-amount">{tx.amount ? formatTokenAmount(tx.amount) : '—'}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <div className="empty-state-icon"><Zap size={24} color="var(--text-3)" /></div>
                        <h3>Awaiting First Scan</h3>
                        <p>NFC redemption events will appear here after the first successful checkout.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
