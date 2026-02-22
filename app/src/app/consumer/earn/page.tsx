'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Link2, Copy, Check, Share2, ExternalLink,
    Users, Trophy, TrendingUp,
} from 'lucide-react';
import { useCommissionLedger, useRecentTransactions, useMerchantConfig } from '@/lib/hooks';
import { shortenAddress, formatTokenAmount } from '@/lib/solana';
import { useWallet } from '@/lib/useWallet';

export default function EarnPage() {
    const wallet = useWallet();
    const config = useMerchantConfig(wallet);
    const commissions = useCommissionLedger(wallet, wallet);
    const txns = useRecentTransactions(wallet, 20);

    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<'tree' | 'leaderboard'>('tree');

    const mc = config.data;
    const cl = commissions.data;

    // Blink link (would be generated from action server in production)
    const blinkUrl = mc
        ? `https://blink.viral-sync.io/refer/${mc.mint.toBase58().slice(0, 8)}?ref=${wallet?.toBase58().slice(0, 8) ?? 'demo'}`
        : 'https://blink.viral-sync.io/refer/demo';

    const handleCopy = () => {
        navigator.clipboard.writeText(blinkUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Share stats from CommissionLedger
    const totalShares = cl?.totalRedemptionsDriven ?? 0;
    const totalEarned = cl ? formatTokenAmount(cl.totalEarned) : '0';
    const highestSingle = cl ? formatTokenAmount(cl.highestSingleCommission) : '0';

    // Recent referral activity (derived from transaction signatures)
    const referralActivity = txns.data?.slice(0, 5).map((tx, i) => ({
        rank: i + 1,
        address: shortenAddress(tx.signature, 6),
        earned: '—',
        time: tx.timestamp ? new Date(tx.timestamp * 1000).toLocaleDateString() : '—',
    })) ?? [];

    return (
        <div style={{ padding: 'var(--space-4)' }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 'var(--space-4)' }}>Earn</h2>

            {/* Blink Link Generator */}
            <motion.div className="chart-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <Link2 size={16} /> Your Blink Link
                </h3>
                <div style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                        <input type="text" readOnly value={blinkUrl}
                            className="text-mono"
                            style={{
                                flex: 1, padding: 'var(--space-3)', fontSize: 13,
                                background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
                                borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
                            }}
                        />
                        <button className={`btn ${copied ? 'btn-primary' : 'btn-secondary'}`} onClick={handleCopy} style={{ minWidth: 80 }}>
                            {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                        </button>
                    </div>
                    {/* Social Share */}
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(blinkUrl)}&text=Earn%20rewards%20with%20Viral%20Sync!`}
                            target="_blank" rel="noopener noreferrer" className="consumer-share-btn twitter">𝕏 Twitter</a>
                        <a href={`https://wa.me/?text=${encodeURIComponent(blinkUrl)}`}
                            target="_blank" rel="noopener noreferrer" className="consumer-share-btn whatsapp">WhatsApp</a>
                        <a href={`https://t.me/share/url?url=${encodeURIComponent(blinkUrl)}`}
                            target="_blank" rel="noopener noreferrer" className="consumer-share-btn telegram">Telegram</a>
                    </div>
                </div>
            </motion.div>

            {/* Stats */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginTop: 'var(--space-4)' }}>
                {[
                    { label: 'Total Shares', value: totalShares.toString(), icon: Share2, color: 'var(--accent-primary)' },
                    { label: 'Total Earned', value: totalEarned, icon: TrendingUp, color: 'var(--success)' },
                    { label: 'Best Commission', value: highestSingle, icon: Trophy, color: 'var(--accent-secondary)' },
                ].map((s, i) => (
                    <motion.div key={s.label} className="stat-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                        <div className="stat-card-header">
                            <span className="stat-label">{s.label}</span>
                            <div className="stat-icon" style={{ background: s.color + '18', color: s.color }}><s.icon size={14} /></div>
                        </div>
                        <div className="stat-value" style={{ fontSize: 20 }}>{s.value}</div>
                    </motion.div>
                ))}
            </div>

            {/* Tabs: Referral Tree / Leaderboard */}
            <div style={{ marginTop: 'var(--space-5)' }}>
                <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                    <button className={`btn btn-sm ${activeTab === 'tree' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setActiveTab('tree')}>
                        <Users size={14} /> Referral Tree
                    </button>
                    <button className={`btn btn-sm ${activeTab === 'leaderboard' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setActiveTab('leaderboard')}>
                        <Trophy size={14} /> Leaderboard
                    </button>
                </div>

                <div className="chart-card" style={{ padding: 'var(--space-2)' }}>
                    {referralActivity.length === 0 && (
                        <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: 'var(--space-6)', fontSize: 14 }}>
                            No referral data yet. Share your Blink link to build your tree!
                        </p>
                    )}
                    {referralActivity.map((r, i) => (
                        <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                                padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--border-secondary)',
                            }}>
                            <span className="text-mono" style={{
                                width: 28, height: 28, borderRadius: 'var(--radius-full)',
                                background: i === 0 ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                                color: i === 0 ? '#fff' : 'var(--text-secondary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 12, fontWeight: 700,
                            }}>#{r.rank}</span>
                            <span className="text-mono" style={{ flex: 1, fontSize: 13 }}>{r.address}</span>
                            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{r.time}</span>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
