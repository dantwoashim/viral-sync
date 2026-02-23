'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Share2, ScanLine, Gift, Network, ArrowUpRight, Clock } from 'lucide-react';
import Link from 'next/link';

const actions = [
    { icon: Share2, label: 'Share', color: 'var(--accent)', bg: 'var(--accent-soft)', href: '/consumer/earn' },
    { icon: ScanLine, label: 'Scan', color: 'var(--accent-2)', bg: 'var(--accent-2-soft)', href: '/consumer/scan' },
    { icon: Gift, label: 'Redeem', color: 'var(--accent-3)', bg: 'var(--accent-3-soft)', href: '/consumer/scan' },
    { icon: Network, label: 'Tree', color: 'var(--purple)', bg: 'var(--purple-soft)', href: '/consumer/profile' },
];

const activity = [
    { id: '1', label: 'Earned from Hari\'s referral', amount: '+60', time: '5m ago', positive: true },
    { id: '2', label: 'Redeemed at Bhat-Bhateni', amount: '-200', time: '2h ago', positive: false },
    { id: '3', label: 'Shared to Sita K.', amount: '+30', time: '4h ago', positive: true },
    { id: '4', label: 'Welcome bonus received', amount: '+100', time: '1d ago', positive: true },
];

const fade = (i: number) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4 } },
});

export default function ConsumerPage() {
    return (
        <>
            <div className="page-top">
                <h1>My Rewards</h1>
                <div className="pill pill-accent">Level 3</div>
            </div>

            <div className="page-scroll">
                {/* Hero */}
                <motion.div {...fade(0)} className="consumer-hero">
                    <div className="total-label">Total Earned</div>
                    <div className="total-amount">1,240.50</div>
                    <div className="total-unit">tokens</div>
                    <div className="consumer-hero-stats">
                        <div className="consumer-hero-stat">
                            <div className="ch-label">Claimable</div>
                            <div className="ch-value">340.00</div>
                        </div>
                        <div className="consumer-hero-stat">
                            <div className="ch-label">Claimed</div>
                            <div className="ch-value">900.50</div>
                        </div>
                        <div className="consumer-hero-stat">
                            <div className="ch-label">Redeemed</div>
                            <div className="ch-value">12</div>
                        </div>
                    </div>
                </motion.div>

                {/* Quick Actions */}
                <motion.div {...fade(1)} className="section">
                    <div className="action-grid">
                        {actions.map((a) => (
                            <Link key={a.label} href={a.href} className="action-btn">
                                <div className="action-btn-icon" style={{ background: a.bg, color: a.color }}>
                                    <a.icon size={24} />
                                </div>
                                <span>{a.label}</span>
                            </Link>
                        ))}
                    </div>
                </motion.div>

                {/* Activity */}
                <motion.div {...fade(2)} className="section">
                    <div className="section-header">
                        <span className="section-title">Recent Activity</span>
                        <span className="section-action">See All</span>
                    </div>
                    <div className="list-card">
                        {activity.map((a) => (
                            <div key={a.id} className="list-item">
                                <div className="list-item-icon" style={{ background: a.positive ? 'var(--success-soft)' : 'var(--accent-soft)', color: a.positive ? 'var(--success)' : 'var(--accent)' }}>
                                    {a.positive ? <ArrowUpRight size={18} /> : <Gift size={18} />}
                                </div>
                                <div className="list-item-content">
                                    <div className="list-item-title">{a.label}</div>
                                    <div className="list-item-sub"><Clock size={10} /> {a.time}</div>
                                </div>
                                <div className="list-item-right">
                                    <div className="list-item-amount" style={{ color: a.positive ? 'var(--success)' : 'var(--text-secondary)' }}>
                                        {a.amount}
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
