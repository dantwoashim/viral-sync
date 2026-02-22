'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Nfc, CheckCircle2, XCircle, Loader2, Shield, MapPin, Clock,
    Zap, AlertTriangle, RefreshCw, Volume2, VolumeX,
    Wifi, WifiOff, Store, Coins, User,
} from 'lucide-react';
import { useRecentTransactions, useMerchantConfig } from '@/lib/hooks';
import { shortenAddress, explorerUrl, formatTokenAmount } from '@/lib/solana';
import { useWallet } from '@/lib/useWallet';

type POSState = 'idle' | 'detected' | 'verifying' | 'success' | 'error';

interface RedemptionResult {
    customerAddress: string;
    tokenAmount: number;
    tokenSymbol: string;
    txSignature: string;
    slot: number;
    genType: 'Gen-1' | 'Gen-2';
    referrerAddress?: string;
    commissionPaid?: number;
}

export default function POSPage() {
    const wallet = useWallet();
    const config = useMerchantConfig(wallet);
    const txns = useRecentTransactions(wallet, 10);

    const [state, setState] = useState<POSState>('idle');
    const [result, setResult] = useState<RedemptionResult | null>(null);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [isOnline, setIsOnline] = useState(true);
    const [currentTime, setCurrentTime] = useState('');

    const mc = config.data;
    const merchantName = mc ? shortenAddress(mc.merchant.toBase58(), 6) : 'Merchant';
    const symbolName = mc ? `$${mc.mint.toBase58().slice(0, 4).toUpperCase()}` : '$TOKEN';

    // Live clock
    useEffect(() => {
        const tick = () => setCurrentTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, []);

    // Online detection
    useEffect(() => {
        const update = () => setIsOnline(navigator.onLine);
        window.addEventListener('online', update);
        window.addEventListener('offline', update);
        return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
    }, []);

    // Transaction stats from on-chain data
    const recentTxns = txns.data ?? [];
    const successCount = recentTxns.filter(t => t.success).length;
    const failCount = recentTxns.filter(t => !t.success).length;

    const simulateTap = useCallback(() => {
        if (state !== 'idle') return;
        setState('detected');
        setTimeout(() => {
            setState('verifying');
            setTimeout(() => {
                const success = Math.random() > 0.15;
                if (success) {
                    setResult({
                        customerAddress: `${Math.random().toString(36).slice(2, 6)}...${Math.random().toString(36).slice(2, 5)}`,
                        tokenAmount: Math.floor(50 + Math.random() * 200),
                        tokenSymbol: symbolName,
                        txSignature: `${Math.random().toString(36).slice(2, 7)}...${Math.random().toString(36).slice(2, 6)}`,
                        slot: 298_000_000 + Math.floor(Math.random() * 1_000_000),
                        genType: Math.random() > 0.5 ? 'Gen-1' : 'Gen-2',
                        referrerAddress: 'alice.sol',
                        commissionPaid: +(Math.random() * 20).toFixed(2),
                    });
                    setState('success');
                } else {
                    setState('error');
                }
            }, 2200);
        }, 800);
    }, [state, symbolName]);

    const reset = () => { setState('idle'); setResult(null); };

    useEffect(() => {
        if (state === 'success' || state === 'error') {
            const timer = setTimeout(reset, 6000);
            return () => clearTimeout(timer);
        }
    }, [state]);

    return (
        <div className="pos-container">
            {/* Status Bar */}
            <div className="pos-status-bar">
                <div className="pos-merchant-badge">
                    <Store size={16} />
                    <span>{merchantName}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                    <span className="text-mono" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{currentTime}</span>
                    <button className="pos-icon-btn" onClick={() => setSoundEnabled(!soundEnabled)}>
                        {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                    </button>
                    <div className={`pos-connection ${isOnline ? 'online' : 'offline'}`}>
                        {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
                        <span>{isOnline ? 'Online' : 'Offline'}</span>
                    </div>
                </div>
            </div>

            <div className="pos-main">
                {/* Scanner */}
                <div className="pos-scanner-panel">
                    <AnimatePresence mode="wait">
                        {state === 'idle' && (
                            <motion.div key="idle" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="pos-scanner-content">
                                <motion.div className="pos-nfc-ring"
                                    animate={{ boxShadow: ['0 0 0 0px rgba(224,122,95,0.3)', '0 0 0 30px rgba(224,122,95,0)'] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}>
                                    <Nfc size={56} strokeWidth={1.5} />
                                </motion.div>
                                <h1 className="pos-headline">Ready to Scan</h1>
                                <p className="pos-subtext">Ask customer to tap their phone or show QR code</p>
                                <button className="btn btn-primary btn-lg" style={{ marginTop: 'var(--space-8)' }} onClick={simulateTap}>
                                    <Zap size={18} /> Simulate NFC Tap
                                </button>
                            </motion.div>
                        )}
                        {state === 'detected' && (
                            <motion.div key="detected" initial={{ opacity: 0, scale: 1.1 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="pos-scanner-content">
                                <motion.div className="pos-nfc-ring detected" initial={{ scale: 0.8 }} animate={{ scale: [0.8, 1.05, 1] }}>
                                    <User size={48} strokeWidth={1.5} />
                                </motion.div>
                                <h1 className="pos-headline" style={{ color: 'var(--accent-primary)' }}>Device Detected</h1>
                                <p className="pos-subtext">Reading wallet payload...</p>
                            </motion.div>
                        )}
                        {state === 'verifying' && (
                            <motion.div key="verifying" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pos-scanner-content">
                                <motion.div className="pos-nfc-ring verifying" animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}>
                                    <Loader2 size={48} strokeWidth={1.5} />
                                </motion.div>
                                <h1 className="pos-headline">Verifying On-Chain</h1>
                                <div className="pos-verify-steps">
                                    {[
                                        { icon: Shield, label: 'NFC Signature Valid', delay: 0 },
                                        { icon: MapPin, label: 'Geo-Attestation', delay: 0.5 },
                                        { icon: Coins, label: 'Token Balance Check', delay: 1.0 },
                                    ].map((step, i) => (
                                        <motion.div key={i} className="pos-verify-step" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: step.delay }}>
                                            <step.icon size={16} /> {step.label}
                                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: step.delay + 0.6 }}>
                                                <CheckCircle2 size={14} style={{ marginLeft: 'auto', color: 'var(--success-text)' }} />
                                            </motion.div>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                        {state === 'success' && result && (
                            <motion.div key="success" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="pos-scanner-content">
                                <motion.div className="pos-result-circle success" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }}>
                                    <CheckCircle2 size={64} strokeWidth={1.5} />
                                </motion.div>
                                <h1 className="pos-headline" style={{ color: 'var(--success-text)' }}>Redeemed!</h1>
                                <div className="pos-amount-display">
                                    <span className="pos-amount-value">{result.tokenAmount}</span>
                                    <span className="pos-amount-symbol">{result.tokenSymbol}</span>
                                </div>
                                <div className="pos-result-details">
                                    <div className="pos-detail-row"><span>Customer</span><span className="text-mono">{result.customerAddress}</span></div>
                                    <div className="pos-detail-row"><span>Type</span><span className={`badge ${result.genType === 'Gen-1' ? 'badge-accent' : 'badge-success'}`}>{result.genType}</span></div>
                                    {result.referrerAddress && (
                                        <div className="pos-detail-row"><span>Referrer</span><span className="text-mono">{result.referrerAddress} <span style={{ color: 'var(--success-text)', fontWeight: 600 }}>+{result.commissionPaid?.toFixed(2)}</span></span></div>
                                    )}
                                    <div className="pos-detail-row"><span>Tx</span><span className="text-mono" style={{ fontSize: 12 }}>{result.txSignature} • Slot {result.slot.toLocaleString()}</span></div>
                                </div>
                                <button className="btn btn-secondary btn-lg" style={{ marginTop: 'var(--space-5)', width: '100%' }} onClick={reset}>
                                    <RefreshCw size={16} /> Next Customer
                                </button>
                            </motion.div>
                        )}
                        {state === 'error' && (
                            <motion.div key="error" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="pos-scanner-content">
                                <motion.div className="pos-result-circle error" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }}>
                                    <XCircle size={64} strokeWidth={1.5} />
                                </motion.div>
                                <h1 className="pos-headline" style={{ color: 'var(--danger-text)' }}>Failed</h1>
                                <p className="pos-subtext"><AlertTriangle size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />Geo-attestation failed.</p>
                                <button className="btn btn-primary btn-lg" style={{ marginTop: 'var(--space-5)' }} onClick={reset}>
                                    <RefreshCw size={16} /> Try Again
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Activity Panel */}
                <div className="pos-activity-panel">
                    <div className="pos-today-stats">
                        <div className="pos-today-stat">
                            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Successes</div>
                            <div className="text-mono" style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>{successCount}</div>
                        </div>
                        <div className="pos-today-stat">
                            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Failed</div>
                            <div className="text-mono" style={{ fontSize: 28, fontWeight: 800, color: failCount > 0 ? 'var(--danger-text)' : 'var(--text-primary)', marginTop: 4 }}>{failCount}</div>
                        </div>
                    </div>

                    <div style={{ marginTop: 'var(--space-5)' }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-3)' }}>Recent</h3>
                        {recentTxns.length === 0 && !txns.loading && (
                            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center', padding: 'var(--space-4)' }}>No transactions yet</p>
                        )}
                        {recentTxns.slice(0, 5).map((tx, i) => (
                            <motion.div key={tx.signature} className="pos-txn-row" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                                <div className={`pos-txn-dot ${tx.success ? 'success' : 'error'}`} />
                                <span className="text-mono" style={{ fontSize: 12, color: 'var(--text-tertiary)', width: 48 }}>
                                    {tx.timestamp ? new Date(tx.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                                </span>
                                <span className="text-mono" style={{ fontSize: 13, color: 'var(--text-secondary)', flex: 1 }}>
                                    {shortenAddress(tx.signature, 4)}
                                </span>
                                <span className="text-mono" style={{ fontSize: 14, fontWeight: 600, color: tx.success ? 'var(--text-primary)' : 'var(--danger-text)' }}>
                                    {tx.success ? 'OK' : 'Fail'}
                                </span>
                            </motion.div>
                        ))}
                    </div>

                    <div className="pos-health-bar">
                        <div className="pos-health-dot" />
                        <span style={{ fontSize: 12, fontWeight: 600, color: isOnline ? 'var(--success-text)' : 'var(--danger-text)' }}>
                            {isOnline ? 'ALL SYSTEMS OPERATIONAL' : 'OFFLINE MODE'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
