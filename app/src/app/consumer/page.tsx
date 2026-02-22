'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
    Share2, ScanLine, Gift, GitBranch,
    ArrowUpRight, MapPin, Clock, ExternalLink,
} from 'lucide-react';
import { useCommissionLedger, useRecentTransactions, useMerchantConfig } from '@/lib/hooks';
import { formatTokenAmount, shortenAddress, explorerUrl, bpsToPercent } from '@/lib/solana';
import { useWallet } from '@/lib/useWallet';

const stagger = {
    hidden: { opacity: 0, y: 16 },
    visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.3 } }),
};

export default function ConsumerHomePage() {
    const wallet = useWallet();
    const config = useMerchantConfig(wallet);
    const commissions = useCommissionLedger(wallet, wallet);
    const txns = useRecentTransactions(wallet, 10);

    const mc = config.data;
    const cl = commissions.data;
    const isLoading = config.loading;

    const totalEarned = cl ? formatTokenAmount(cl.totalEarned) : '0.00';
    const claimable = cl ? formatTokenAmount(cl.claimable) : '0.00';
    const totalClaimed = cl ? formatTokenAmount(cl.totalClaimed) : '0.00';

    const activities = txns.data?.slice(0, 6).map((tx) => ({
        id: tx.signature.slice(0, 8),
        label: tx.description,
        time: tx.timestamp ? new Date(tx.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—',
        positive: tx.success,
        link: explorerUrl(tx.signature, 'tx'),
    })) ?? [];

    return (
        <div style={{ padding: 'var(--space-4)' }}>
            {/* Hero Earnings Card */}
            <motion.div className="consumer-hero-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                <div className="consumer-hero-label">Total Earned</div>
                <div className="consumer-hero-amount">{totalEarned}</div>
                <div className="consumer-hero-subtitle">
                    {mc ? mc.mint.toBase58().slice(0, 8) + '… tokens' : 'tokens'}
                </div>
                <div className="consumer-hero-breakdown">
                    <div className="consumer-hero-stat">
                        <span>Claimable</span>
                        <strong>{claimable}</strong>
                    </div>
                    <div className="consumer-hero-stat">
                        <span>Claimed</span>
                        <strong>{totalClaimed}</strong>
                    </div>
                    <div className="consumer-hero-stat">
                        <span>Redemptions</span>
                        <strong>{cl?.totalRedemptionsDriven?.toString() ?? '0'}</strong>
                    </div>
                </div>
                {isLoading && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 'var(--space-2)' }}>Loading on-chain data…</div>}
            </motion.div>

            {/* Quick Actions */}
            <div className="consumer-actions">
                {[
                    { icon: Share2, label: 'Share', color: 'var(--accent-primary)' },
                    { icon: ScanLine, label: 'Scan', color: 'var(--success)' },
                    { icon: Gift, label: 'Redeem', color: 'var(--accent-secondary)' },
                    { icon: GitBranch, label: 'Tree', color: '#8B5CF6' },
                ].map((action, i) => (
                    <motion.button key={action.label} className="consumer-action-btn" custom={i} initial="hidden" animate="visible" variants={stagger}>
                        <div className="consumer-action-icon" style={{ background: action.color + '18', color: action.color }}>
                            <action.icon size={20} />
                        </div>
                        <span>{action.label}</span>
                    </motion.button>
                ))}
            </div>

            {/* Activity / Transactions */}
            <div style={{ marginTop: 'var(--space-5)' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 'var(--space-3)', color: 'var(--text-primary)' }}>Recent Activity</h3>
                <div className="consumer-feed">
                    {activities.length === 0 && !txns.loading && (
                        <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 14 }}>
                            No transactions yet. Share your referral link to start earning!
                        </div>
                    )}
                    {activities.map((item, i) => (
                        <motion.div key={item.id} className="consumer-feed-item" custom={i} initial="hidden" animate="visible" variants={stagger}>
                            <div className={`feed-dot ${item.positive ? 'positive' : 'negative'}`} style={{ flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Clock size={10} /> {item.time}
                                </div>
                            </div>
                            <a href={item.link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', flexShrink: 0 }}>
                                <ExternalLink size={14} />
                            </a>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Merchant Info */}
            {mc && (
                <div style={{ marginTop: 'var(--space-5)' }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 'var(--space-3)', color: 'var(--text-primary)' }}>Merchant</h3>
                    <div className="consumer-feed">
                        <div className="consumer-feed-item">
                            <MapPin size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 14, fontWeight: 600 }}>{shortenAddress(mc.merchant.toBase58(), 6)}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                                    Commission: {bpsToPercent(mc.commissionRateBps).toFixed(1)}% · Expiry: {mc.tokenExpiryDays}d
                                </div>
                            </div>
                            <a href={explorerUrl(mc.merchant.toBase58())} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)' }}>
                                <ExternalLink size={14} />
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
