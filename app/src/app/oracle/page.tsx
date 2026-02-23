'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid,
} from 'recharts';
import { Target, Clock, Zap, TrendingUp, BarChart3 } from 'lucide-react';

// ── Demo Data ──
const kFactor = 1.47;
const funnelData = [
    { stage: 'Shared', rate: 78 },
    { stage: 'Claimed', rate: 45 },
    { stage: 'Redeemed', rate: 23 },
];

const metrics = [
    { label: 'Avg Share → Claim', value: '2.4h' },
    { label: 'Avg Claim → Redeem', value: '18.6h' },
    { label: 'Cost per Customer', value: '12.5 tokens' },
    { label: 'vs Google Ads', value: '340% better' },
    { label: 'Data Points', value: '4,291' },
    { label: 'Last Computed', value: '2 min ago' },
    { label: 'Median Refs/User', value: '3.2' },
    { label: 'P90 Refs/User', value: '8.7' },
    { label: 'Concentration Index', value: '0.23' },
];

const fade = (i: number) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4 } },
});

export default function OraclePage() {
    return (
        <>
            <div className="page-top">
                <h1>Viral Oracle</h1>
                <div className="pill pill-success">● 4,291 pts</div>
            </div>

            <div className="page-scroll">
                {/* K-Factor Hero */}
                <motion.div {...fade(0)} className="glass" style={{ marginBottom: 'var(--space-4)' }}>
                    <div className="hero-stat">
                        <div className="hero-stat-label">Viral Coefficient (K-Factor)</div>
                        <div className="hero-stat-value glow-green">{kFactor.toFixed(2)}</div>
                        <div style={{ marginTop: 'var(--space-3)' }}>
                            <span className="pill pill-success">Super-Viral</span>
                        </div>
                        <div className="hero-stat-sub" style={{ maxWidth: 300, margin: 'var(--space-3) auto 0' }}>
                            Each referrer generates 1.47 new customers on average — exponential growth territory.
                        </div>
                    </div>
                </motion.div>

                {/* Conversion Funnel */}
                <motion.div {...fade(1)}>
                    <div className="chart-wrap glass">
                        <h3><Target size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} />Conversion Funnel</h3>
                        <div className="chart-sub">Share → Claim → Redeem rates</div>

                        <div className="funnel">
                            <div className="funnel-row">
                                <div className="funnel-label">Shared</div>
                                <div className="funnel-bar-wrap">
                                    <div className="funnel-bar" style={{ width: '78%', background: 'linear-gradient(90deg, var(--accent), #D4654A)' }}>
                                        <span>78%</span>
                                    </div>
                                </div>
                            </div>
                            <div className="funnel-row">
                                <div className="funnel-label">Claimed</div>
                                <div className="funnel-bar-wrap">
                                    <div className="funnel-bar" style={{ width: '45%', background: 'linear-gradient(90deg, var(--accent-2), #6B9E84)' }}>
                                        <span>45%</span>
                                    </div>
                                </div>
                            </div>
                            <div className="funnel-row">
                                <div className="funnel-label">Redeemed</div>
                                <div className="funnel-bar-wrap">
                                    <div className="funnel-bar" style={{ width: '23%', background: 'linear-gradient(90deg, var(--purple), #7C4FE0)' }}>
                                        <span>23%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Recharts Bar */}
                <motion.div {...fade(2)} className="section">
                    <div className="chart-wrap glass">
                        <h3><BarChart3 size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} />Funnel Breakdown</h3>
                        <div className="chart-sub">Percentage at each stage</div>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={funnelData} barSize={36}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                <XAxis dataKey="stage" tick={{ fill: 'rgba(245,245,247,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: 'rgba(245,245,247,0.38)', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                                <Tooltip contentStyle={{ background: 'rgba(18,18,28,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }} />
                                <defs>
                                    <linearGradient id="oBarG" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="var(--accent-2)" />
                                        <stop offset="100%" stopColor="#4B8A6E" />
                                    </linearGradient>
                                </defs>
                                <Bar dataKey="rate" fill="url(#oBarG)" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Efficiency Metrics */}
                <motion.div {...fade(3)} className="section">
                    <div className="section-header">
                        <span className="section-title">
                            <Zap size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} />
                            Efficiency Metrics
                        </span>
                    </div>
                    <div className="glass" style={{ padding: 'var(--space-4)' }}>
                        {metrics.map((m) => (
                            <div key={m.label} className="metric-row">
                                <span className="metric-label">{m.label}</span>
                                <span className="metric-value">{m.value}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>

                <div style={{ height: 'var(--space-8)' }} />
            </div>
        </>
    );
}
