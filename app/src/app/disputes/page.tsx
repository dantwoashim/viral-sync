'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Clock, CheckCircle, AlertTriangle, Lock, XCircle, ChevronRight } from 'lucide-react';

const disputes = [
    { id: 'DSP-001', title: 'Duplicate redemption claim', status: 'Resolved', amount: '120', date: 'Feb 20', icon: CheckCircle, color: 'var(--success)' },
    { id: 'DSP-002', title: 'Suspicious referral chain', status: 'Under Review', amount: '450', date: 'Feb 19', icon: Clock, color: 'var(--warning)' },
    { id: 'DSP-003', title: 'Token generation mismatch', status: 'Escalated', amount: '890', date: 'Feb 18', icon: AlertTriangle, color: 'var(--danger)' },
    { id: 'DSP-004', title: 'Commission miscalculation', status: 'Resolved', amount: '65', date: 'Feb 15', icon: CheckCircle, color: 'var(--success)' },
];

const bonds = [
    { label: 'Bond Amount', value: '5.00 SOL' },
    { label: 'Bond Status', value: 'Locked' },
    { label: 'Reputation', value: '94 / 100' },
    { label: 'Suspicion Score', value: '3 / 100' },
    { label: 'Active Disputes', value: '1' },
    { label: 'Resolved', value: '2' },
];

const fade = (i: number) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4 } },
});

export default function DisputesPage() {
    return (
        <>
            <div className="page-top">
                <h1>Disputes</h1>
                <div className="pill pill-warning">1 active</div>
            </div>

            <div className="page-scroll">
                {/* Bond Status */}
                <motion.div {...fade(0)} className="glass" style={{ padding: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: 'var(--success-soft)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Lock size={20} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 700 }}>Merchant Bond</div>
                            <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Secured · No slashing events</div>
                        </div>
                    </div>
                    {bonds.map((b) => (
                        <div key={b.label} className="metric-row">
                            <span className="metric-label">{b.label}</span>
                            <span className="metric-value">{b.value}</span>
                        </div>
                    ))}
                </motion.div>

                {/* Dispute List */}
                <motion.div {...fade(1)} className="section">
                    <div className="section-header">
                        <span className="section-title">
                            <ShieldAlert size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} />
                            Dispute History
                        </span>
                    </div>
                    <div className="list-card">
                        {disputes.map((d) => (
                            <div key={d.id} className="list-item">
                                <div className="list-item-icon" style={{ background: d.color + '18', color: d.color }}>
                                    <d.icon size={18} />
                                </div>
                                <div className="list-item-content">
                                    <div className="list-item-title">{d.title}</div>
                                    <div className="list-item-sub">{d.id} · {d.date}</div>
                                </div>
                                <div className="list-item-right" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <div className="list-item-amount">{d.amount}</div>
                                    <ChevronRight size={14} color="var(--text-hint)" />
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
