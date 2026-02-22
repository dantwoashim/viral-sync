'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    User, Wallet, Copy, Check, ExternalLink, Key,
    Bell, BellOff, LogOut, Shield, Clock,
} from 'lucide-react';
import { useSolBalance, useMerchantConfig, useCommissionLedger } from '@/lib/hooks';
import { shortenAddress, lamportsToSol, explorerUrl, formatTokenAmount } from '@/lib/solana';
import { useWallet } from '@/lib/useWallet';
import { useAuth } from '@/lib/auth';

export default function ProfilePage() {
    const wallet = useWallet();
    const { displayName, logout, loginMethod } = useAuth();
    const config = useMerchantConfig(wallet);
    const balance = useSolBalance(wallet);
    const commissions = useCommissionLedger(wallet, wallet);

    const [copied, setCopied] = useState(false);
    const [notifications, setNotifications] = useState({
        commissions: true, disputes: true, merchants: false, digest: true,
    });

    const mc = config.data;
    const cl = commissions.data;
    const walletAddress = wallet?.toBase58() ?? 'Not connected';
    const solBalance = balance.data !== null ? lamportsToSol(balance.data).toFixed(4) : '—';

    const handleCopy = () => {
        if (wallet) {
            navigator.clipboard.writeText(wallet.toBase58());
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div style={{ padding: 'var(--space-4)' }}>
            {/* Avatar + Name */}
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-5)' }}>
                <motion.div
                    className="consumer-avatar"
                    initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                >
                    <User size={32} />
                </motion.div>
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 'var(--space-3)' }}>
                    {wallet ? (displayName || shortenAddress(walletAddress, 6)) : 'No Wallet Connected'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 }}>
                    {solBalance} SOL
                </div>
            </div>

            {/* Wallet Address */}
            <div className="chart-card" style={{ marginBottom: 'var(--space-4)' }}>
                <h3><Wallet size={16} style={{ verticalAlign: '-3px', marginRight: 8 }} />Wallet</h3>
                <div style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                        <span className="text-mono" style={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {walletAddress}
                        </span>
                        <button className="btn btn-sm btn-secondary" onClick={handleCopy} style={{ minWidth: 60 }}>
                            {copied ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                        {wallet && (
                            <a href={explorerUrl(walletAddress)} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-secondary">
                                <ExternalLink size={12} />
                            </a>
                        )}
                    </div>
                    {/* Balance breakdown */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
                        <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-3)' }}>
                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>SOL Balance</div>
                            <div className="text-mono" style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{solBalance}</div>
                        </div>
                        <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-3)' }}>
                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Tokens Earned</div>
                            <div className="text-mono" style={{ fontSize: 16, fontWeight: 700, marginTop: 2, color: 'var(--accent-primary)' }}>
                                {cl ? formatTokenAmount(cl.totalEarned) : '0'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Embedded Wallet Info */}
            <div className="chart-card" style={{ marginBottom: 'var(--space-4)' }}>
                <h3><Shield size={16} style={{ verticalAlign: '-3px', marginRight: 8 }} />Embedded Wallet</h3>
                <div style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    <div className="consumer-menu-item">
                        <span style={{ fontSize: 14 }}>Provider</span>
                        <span className="badge badge-accent">Privy (MPC)</span>
                    </div>
                    <div className="consumer-menu-item">
                        <span style={{ fontSize: 14 }}>Recovery</span>
                        <span style={{ fontSize: 13, color: 'var(--success-text)' }}>Social Recovery Active</span>
                    </div>
                </div>
            </div>

            {/* Session Keys */}
            <div className="chart-card" style={{ marginBottom: 'var(--space-4)' }}>
                <h3><Key size={16} style={{ verticalAlign: '-3px', marginRight: 8 }} />Session Keys</h3>
                <div style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    {mc ? (
                        <div className="consumer-menu-item">
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 500 }}>Active Session</div>
                                <div className="text-mono" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                                    Mint: {shortenAddress(mc.mint.toBase58(), 6)}
                                </div>
                            </div>
                            <span className="badge badge-success">Active</span>
                        </div>
                    ) : (
                        <p style={{ color: 'var(--text-tertiary)', fontSize: 14, textAlign: 'center', padding: 'var(--space-3)' }}>
                            No active session keys. Connect to a merchant to enable.
                        </p>
                    )}
                </div>
            </div>

            {/* Notification Toggles */}
            <div className="chart-card" style={{ marginBottom: 'var(--space-4)' }}>
                <h3><Bell size={16} style={{ verticalAlign: '-3px', marginRight: 8 }} />Notifications</h3>
                <div style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    {Object.entries(notifications).map(([key, enabled]) => (
                        <div key={key} className="consumer-menu-item" style={{ justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 14, textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1')}</span>
                            <button
                                onClick={() => setNotifications(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                                style={{
                                    width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                                    background: enabled ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                                    position: 'relative', transition: 'background 0.2s',
                                }}>
                                <div style={{
                                    width: 18, height: 18, borderRadius: '50%', background: '#fff',
                                    position: 'absolute', top: 3, transition: 'left 0.2s',
                                    left: enabled ? 23 : 3,
                                }} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Sign Out */}
            <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', color: 'var(--danger-text)' }}>
                <LogOut size={16} /> Sign Out
            </button>
        </div>
    );
}
