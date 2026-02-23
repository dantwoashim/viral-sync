'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Network, Users, TrendingUp, ArrowUpRight } from 'lucide-react';

// ── Demo Network Data ──
const topReferrers = [
    { rank: 1, name: 'Hari B.', refs: 23, earned: '2,340', gen: 3 },
    { rank: 2, name: 'Gita R.', refs: 18, earned: '1,890', gen: 2 },
    { rank: 3, name: 'Aayush S.', refs: 15, earned: '1,450', gen: 3 },
    { rank: 4, name: 'Sita K.', refs: 12, earned: '980', gen: 2 },
    { rank: 5, name: 'Ram T.', refs: 9, earned: '720', gen: 1 },
    { rank: 6, name: 'Bibek M.', refs: 7, earned: '540', gen: 2 },
];

const networkStats = [
    { label: 'Total Users', value: '2,847' },
    { label: 'Active Chains', value: '184' },
    { label: 'Max Depth', value: '5 gens' },
    { label: 'Avg Chain Length', value: '2.8' },
];

const fade = (i: number) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4 } },
});

const rankColors = ['var(--accent-3)', 'var(--text-secondary)', 'var(--accent)'];

export default function NetworkPage() {
    return (
        <>
            <div className="page-top">
                <h1>Network</h1>
                <div className="pill pill-accent"><Users size={12} /> 2,847</div>
            </div>

            <div className="page-scroll">
                {/* Stats */}
                <motion.div {...fade(0)} className="stats-grid" style={{ marginBottom: 'var(--space-4)' }}>
                    {networkStats.map((s) => (
                        <div key={s.label} className="stat-card glass">
                            <div className="stat-label">{s.label}</div>
                            <div className="stat-value">{s.value}</div>
                        </div>
                    ))}
                </motion.div>

                {/* Network Visual */}
                <motion.div {...fade(1)} className="glass" style={{ padding: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
                    <h3 style={{ marginBottom: 'var(--space-3)' }}>
                        <Network size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} />
                        Referral Depth
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        {[
                            { gen: 'Gen 1 (Direct)', count: 847, pct: 100 },
                            { gen: 'Gen 2', count: 1240, pct: 73 },
                            { gen: 'Gen 3', count: 520, pct: 43 },
                            { gen: 'Gen 4', count: 180, pct: 21 },
                            { gen: 'Gen 5', count: 60, pct: 10 },
                        ].map((g) => (
                            <div key={g.gen}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>{g.gen}</span>
                                    <span className="text-mono" style={{ fontWeight: 600 }}>{g.count}</span>
                                </div>
                                <div className="progress">
                                    <div className="progress-fill" style={{ width: `${g.pct}%`, background: `linear-gradient(90deg, var(--accent), var(--accent-3))` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Leaderboard */}
                <motion.div {...fade(2)} className="section">
                    <div className="section-header">
                        <span className="section-title">
                            <TrendingUp size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} />
                            Top Referrers
                        </span>
                    </div>
                    <div className="list-card">
                        {topReferrers.map((r) => (
                            <div key={r.rank} className="list-item">
                                <div className="list-item-icon" style={{
                                    background: r.rank <= 3 ? (rankColors[r.rank - 1] + '22') : 'var(--bg-glass)',
                                    color: r.rank <= 3 ? rankColors[r.rank - 1] : 'var(--text-secondary)',
                                    borderRadius: 'var(--radius-full)',
                                    fontWeight: 800,
                                    fontSize: 16,
                                }}>
                                    {r.rank}
                                </div>
                                <div className="list-item-content">
                                    <div className="list-item-title">{r.name}</div>
                                    <div className="list-item-sub">{r.refs} referrals · {r.gen} gen deep</div>
                                </div>
                                <div className="list-item-right">
                                    <div className="list-item-amount" style={{ color: 'var(--success)' }}>
                                        <ArrowUpRight size={12} /> {r.earned}
                                    </div>
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
