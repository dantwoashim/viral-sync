'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Zap, TrendingUp, Share2, Copy, ExternalLink } from 'lucide-react';

const referrals = [
    { id: '1', name: 'Sita Kumari', earned: 60, status: 'Redeemed', date: 'Feb 20' },
    { id: '2', name: 'Bibek Tamang', earned: 45, status: 'Claimed', date: 'Feb 19' },
    { id: '3', name: 'Gita Rai', earned: 30, status: 'Shared', date: 'Feb 18' },
    { id: '4', name: 'Hari Bahadur', earned: 90, status: 'Redeemed', date: 'Feb 17' },
];

const statusColor: Record<string, string> = {
    Redeemed: 'pill-success',
    Claimed: 'pill-accent',
    Shared: 'pill-purple',
};

const fade = (i: number) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4 } },
});

export default function EarnPage() {
    return (
        <>
            <div className="page-top">
                <h1>Earn</h1>
                <div className="pill pill-accent">
                    <Zap size={12} /> 225 earned
                </div>
            </div>

            <div className="page-scroll">
                {/* Share Link */}
                <motion.div {...fade(0)} className="glass" style={{ padding: 'var(--space-5)' }}>
                    <h3 style={{ marginBottom: 'var(--space-2)' }}>
                        <Share2 size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} />
                        Your Referral Link
                    </h3>
                    <div style={{ display: 'flex', gap: 8, marginTop: 'var(--space-3)' }}>
                        <div style={{ flex: 1, padding: '10px 14px', background: 'var(--bg-glass-strong)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            viral.sync/ref/prab1n_g
                        </div>
                        <button style={{ padding: '10px 16px', background: 'var(--accent-soft)', color: 'var(--accent)', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: 13 }}>
                            <Copy size={14} />
                        </button>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 'var(--space-3)' }}>
                        Share this link. Earn 5% commission on every purchase your referrals make.
                    </p>
                </motion.div>

                {/* Stats */}
                <motion.div {...fade(1)} className="stats-grid" style={{ marginTop: 'var(--space-4)' }}>
                    <div className="stat-card glass">
                        <div className="stat-label">Total Referrals</div>
                        <div className="stat-value" style={{ color: 'var(--accent)' }}>47</div>
                    </div>
                    <div className="stat-card glass">
                        <div className="stat-label">Active Chain</div>
                        <div className="stat-value" style={{ color: 'var(--success)' }}>3</div>
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>generations deep</div>
                    </div>
                </motion.div>

                {/* Referral List */}
                <motion.div {...fade(2)} className="section">
                    <div className="section-header">
                        <span className="section-title">Your Referrals</span>
                    </div>
                    <div className="list-card">
                        {referrals.map((r) => (
                            <div key={r.id} className="list-item">
                                <div className="list-item-icon" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', borderRadius: 'var(--radius-full)', fontSize: 14, fontWeight: 700 }}>
                                    {r.name.charAt(0)}
                                </div>
                                <div className="list-item-content">
                                    <div className="list-item-title">{r.name}</div>
                                    <div className="list-item-sub">{r.date} · <span className={`pill ${statusColor[r.status]}`}>{r.status}</span></div>
                                </div>
                                <div className="list-item-right">
                                    <div className="list-item-amount" style={{ color: 'var(--success)' }}>+{r.earned}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                <div style={{ height: 'var(--space-8)' }} />
            </div>
        </>
    );
}
