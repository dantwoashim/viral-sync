'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { User, Coins, TrendingUp, Shield, Network, Clock, ChevronRight } from 'lucide-react';

const stats = [
    { label: 'Tokens Held', value: '1,240.50', icon: Coins, color: 'var(--accent)' },
    { label: 'Gen-1 Tokens', value: '820', icon: TrendingUp, color: 'var(--success)' },
    { label: 'Gen-2 Tokens', value: '420.50', icon: Network, color: 'var(--purple)' },
    { label: 'Referral Rank', value: '#12', icon: Shield, color: 'var(--accent-3)' },
];

const fade = (i: number) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4 } },
});

export default function ProfilePage() {
    return (
        <>
            <div className="page-top">
                <h1>Profile</h1>
            </div>

            <div className="page-scroll">
                {/* Avatar */}
                <motion.div {...fade(0)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
                    <div style={{ width: 72, height: 72, borderRadius: 'var(--radius-full)', background: 'linear-gradient(135deg, var(--accent), var(--accent-3))', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-3)' }}>
                        <User size={32} color="white" />
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>Prabin Ghimire</div>
                    <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>prab1n.sol</div>
                    <div className="pill pill-accent" style={{ marginTop: 'var(--space-2)' }}>Level 3 · Active</div>
                </motion.div>

                {/* Stats */}
                <motion.div {...fade(1)} className="stats-grid">
                    {stats.map((s) => (
                        <div key={s.label} className="stat-card glass">
                            <div className="stat-icon" style={{ background: s.color + '18', color: s.color }}>
                                <s.icon size={18} />
                            </div>
                            <div className="stat-label">{s.label}</div>
                            <div className="stat-value">{s.value}</div>
                        </div>
                    ))}
                </motion.div>

                {/* Referral Tree */}
                <motion.div {...fade(2)} className="section">
                    <div className="section-header">
                        <span className="section-title">Referral Tree</span>
                    </div>
                    <div className="glass" style={{ padding: 'var(--space-4)' }}>
                        <div className="metric-row">
                            <span className="metric-label">Direct Referrals</span>
                            <span className="metric-value">12</span>
                        </div>
                        <div className="metric-row">
                            <span className="metric-label">2nd Generation</span>
                            <span className="metric-value">34</span>
                        </div>
                        <div className="metric-row">
                            <span className="metric-label">Total Network</span>
                            <span className="metric-value">47</span>
                        </div>
                        <div className="metric-row">
                            <span className="metric-label">Deepest Chain</span>
                            <span className="metric-value">3 gens</span>
                        </div>
                    </div>
                </motion.div>

                <div style={{ height: 'var(--space-8)' }} />
            </div>
        </>
    );
}
