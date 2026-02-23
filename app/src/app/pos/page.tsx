'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Wifi, Zap, CheckCircle, XCircle, Clock, ChevronRight, Home } from 'lucide-react';
import Link from 'next/link';

const demoResults = [
    { id: '1', customer: 'Aayush S.', tokens: 120, time: '2:41 PM', success: true },
    { id: '2', customer: 'Priya M.', tokens: 85, time: '2:38 PM', success: true },
    { id: '3', customer: 'Bibek T.', tokens: 200, time: '2:30 PM', success: true },
    { id: '4', customer: 'Sita R.', tokens: 50, time: '2:15 PM', success: false },
];

export default function POSPage() {
    const [state, setState] = useState<'idle' | 'scanning' | 'success'>('idle');

    const simulateScan = () => {
        setState('scanning');
        setTimeout(() => setState('success'), 1500);
        setTimeout(() => setState('idle'), 4000);
    };

    return (
        <div className="pos-screen">
            {/* Header */}
            <div className="pos-header">
                <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)' }}>
                    <Home size={18} /> Merchant
                </Link>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--text-secondary)' }}>
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="pill pill-success">● Online</div>
            </div>

            {/* NFC Ring */}
            <motion.div
                className="pos-nfc-ring"
                animate={state === 'scanning' ? { scale: [1, 1.05, 1], borderColor: ['var(--accent)', 'var(--success)', 'var(--accent)'] } : state === 'success' ? { borderColor: 'var(--success)' } : {}}
                transition={{ duration: 1, repeat: state === 'scanning' ? Infinity : 0 }}
            >
                {state === 'idle' && <Wifi size={64} color="var(--accent)" style={{ opacity: 0.6 }} />}
                {state === 'scanning' && (
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                        <Zap size={64} color="var(--accent)" />
                    </motion.div>
                )}
                {state === 'success' && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}>
                        <CheckCircle size={64} color="var(--success)" />
                    </motion.div>
                )}
            </motion.div>

            <h2 style={{ marginBottom: 4 }}>
                {state === 'idle' ? 'Ready to Scan' : state === 'scanning' ? 'Scanning...' : 'Redemption Complete!'}
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 260 }}>
                {state === 'idle' ? 'Ask customer to tap their phone or show QR code' : state === 'scanning' ? 'Processing customer tokens...' : '120 tokens redeemed · Commission paid to referrer'}
            </p>

            <button className="pos-cta" onClick={simulateScan}>
                <Zap size={18} style={{ verticalAlign: '-3px', marginRight: 6 }} />
                {state === 'idle' ? 'Simulate NFC Tap' : state === 'success' ? '✓ Done' : 'Scanning...'}
            </button>

            {/* Stats */}
            <div className="pos-stats">
                <div className="pos-stat">
                    <div className="pos-stat-val" style={{ color: 'var(--success)' }}>47</div>
                    <div className="pos-stat-label">Today</div>
                </div>
                <div className="pos-stat">
                    <div className="pos-stat-val">3</div>
                    <div className="pos-stat-label">Failed</div>
                </div>
                <div className="pos-stat">
                    <div className="pos-stat-val" style={{ color: 'var(--accent)' }}>8.2K</div>
                    <div className="pos-stat-label">Tokens</div>
                </div>
            </div>

            {/* Recent */}
            <div className="section" style={{ width: '100%', marginTop: 'var(--space-6)' }}>
                <div className="section-header">
                    <span className="section-title">Recent Scans</span>
                </div>
                <div className="list-card">
                    {demoResults.map((r) => (
                        <div key={r.id} className="list-item">
                            <div className="list-item-icon" style={{ background: r.success ? 'var(--success-soft)' : 'var(--danger-soft)', color: r.success ? 'var(--success)' : 'var(--danger)' }}>
                                {r.success ? <CheckCircle size={18} /> : <XCircle size={18} />}
                            </div>
                            <div className="list-item-content">
                                <div className="list-item-title">{r.customer}</div>
                                <div className="list-item-sub"><Clock size={10} /> {r.time}</div>
                            </div>
                            <div className="list-item-right">
                                <div className="list-item-amount">{r.tokens}</div>
                                <div className="list-item-time">tokens</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
