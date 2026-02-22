'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid, RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from 'recharts';
import { Zap, TrendingUp, Clock, Target, BarChart3, AlertTriangle } from 'lucide-react';
import { useViralOracle, useMerchantConfig } from '@/lib/hooks';
import { fixedToDecimal, bpsToPercent, formatTokenAmount } from '@/lib/solana';
import { useWallet } from '@/lib/useWallet';

const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.35 } }),
};

export default function OraclePage() {
    const wallet = useWallet();
    const oracle = useViralOracle(wallet);
    const config = useMerchantConfig(wallet);
    const vo = oracle.data;
    const mc = config.data;
    const isLoading = oracle.loading;

    // K-Factor display
    const kFactor = vo ? fixedToDecimal(vo.kFactor) : 0;
    const kLabel = kFactor >= 1.5 ? 'Super-Viral' : kFactor >= 1.0 ? 'Viral' : kFactor > 0 ? 'Sub-Viral' : '—';

    // Funnel data
    const funnelData = vo ? [
        { stage: 'Shared', rate: fixedToDecimal(vo.shareRate) * 100, fillColor: 'var(--accent-primary)' },
        { stage: 'Claimed', rate: fixedToDecimal(vo.claimRate) * 100, fillColor: 'var(--accent-secondary)' },
        { stage: 'Redeemed', rate: fixedToDecimal(vo.firstRedeemRate) * 100, fillColor: 'var(--success)' },
    ] : [
        { stage: 'Shared', rate: 0 }, { stage: 'Claimed', rate: 0 }, { stage: 'Redeemed', rate: 0 },
    ];

    // Distribution radar
    const distributionData = vo ? [
        { metric: 'Median Refs', value: fixedToDecimal(vo.medianReferralsPerUser) },
        { metric: 'P90 Refs', value: fixedToDecimal(vo.p90ReferralsPerUser) },
        { metric: 'P10 Refs', value: fixedToDecimal(vo.p10ReferralsPerUser) },
        { metric: 'Concentration', value: fixedToDecimal(vo.referralConcentrationIndex) },
        { metric: 'Share→Claim (h)', value: vo.avgTimeShareToClaimSecs / 3600 },
        { metric: 'Claim→Redeem (h)', value: vo.avgTimeClaimToRedeemSecs / 3600 },
    ] : [];

    // Efficiency comparison
    const vsGoogle = vo ? fixedToDecimal(vo.vsGoogleAdsEfficiencyBps) : 0;
    const commPerCustomer = vo ? formatTokenAmount(vo.commissionPerNewCustomerTokens) : '—';

    return (
        <div className="page-content">
            <div className="page-header">
                <div>
                    <h1>Viral Oracle</h1>
                    <p>
                        {vo
                            ? `Last computed: ${new Date(vo.computedAt * 1000).toLocaleString()} · ${vo.dataPoints.toLocaleString()} data points`
                            : 'Connect merchant to see oracle analytics'}
                    </p>
                </div>
                {isLoading && <span className="badge badge-warning">Loading…</span>}
            </div>

            {/* K-Factor Hero */}
            <motion.div className="chart-card" initial="hidden" animate="visible" custom={0} variants={fadeUp}
                style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-tertiary)', marginBottom: 'var(--space-2)' }}>
                    Viral Coefficient (K-Factor)
                </div>
                <div style={{ fontSize: 64, fontWeight: 800, fontFamily: 'var(--font-mono)', color: kFactor >= 1.0 ? 'var(--success-text)' : 'var(--warning-text)', letterSpacing: '-0.03em' }}>
                    {kFactor > 0 ? kFactor.toFixed(2) : '—'}
                </div>
                <span className={`badge ${kFactor >= 1.0 ? 'badge-success' : 'badge-warning'}`} style={{ marginTop: 'var(--space-2)' }}>
                    {kLabel}
                </span>
                <p style={{ marginTop: 'var(--space-3)', fontSize: 13, color: 'var(--text-secondary)', maxWidth: 400, margin: 'var(--space-3) auto 0' }}>
                    {kFactor >= 1.0 ? 'Each referrer generates more than one new customer on average — exponential growth territory.' : 'Each referrer generates less than one new customer. Focus on improving claim and redeem rates.'}
                </p>
            </motion.div>

            <div className="charts-row">
                {/* Conversion Funnel */}
                <motion.div className="chart-card" initial="hidden" animate="visible" custom={1} variants={fadeUp}>
                    <h3><Target size={16} style={{ verticalAlign: '-3px', marginRight: 8 }} />Conversion Funnel</h3>
                    <p className="chart-subtitle">Share → Claim → Redeem conversion rates</p>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={funnelData} barSize={50}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-secondary)" />
                                <XAxis dataKey="stage" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} unit="%" />
                                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 8, fontSize: 13 }} />
                                <defs>
                                    <linearGradient id="funnelGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="var(--accent-primary)" />
                                        <stop offset="100%" stopColor="var(--accent-secondary)" />
                                    </linearGradient>
                                </defs>
                                <Bar dataKey="rate" fill="url(#funnelGrad)" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Distribution Radar */}
                <motion.div className="chart-card" initial="hidden" animate="visible" custom={2} variants={fadeUp}>
                    <h3><BarChart3 size={16} style={{ verticalAlign: '-3px', marginRight: 8 }} />Distribution Profile</h3>
                    <p className="chart-subtitle">Referral distribution and time-to-conversion</p>
                    <div className="chart-container">
                        {distributionData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <RadarChart data={distributionData}>
                                    <PolarGrid stroke="var(--border-secondary)" />
                                    <PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                                    <Radar dataKey="value" stroke="var(--accent-primary)" fill="var(--accent-primary)" fillOpacity={0.2} strokeWidth={2} />
                                </RadarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: 14 }}>
                                No oracle data available
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Metrics Row */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                {[
                    { label: 'Avg Share→Claim', value: vo ? `${(vo.avgTimeShareToClaimSecs / 3600).toFixed(1)}h` : '—', icon: Clock, color: 'var(--accent-primary)' },
                    { label: 'Avg Claim→Redeem', value: vo ? `${(vo.avgTimeClaimToRedeemSecs / 3600).toFixed(1)}h` : '—', icon: Clock, color: 'var(--accent-secondary)' },
                    { label: 'Cost per Customer', value: commPerCustomer, icon: Zap, color: 'var(--success)' },
                    { label: 'vs Google Ads', value: vsGoogle > 0 ? `${vsGoogle.toFixed(0)}% efficient` : '—', icon: TrendingUp, color: vsGoogle > 100 ? 'var(--success)' : 'var(--warning)' },
                ].map((m, i) => (
                    <motion.div key={m.label} className="stat-card" custom={i + 3} initial="hidden" animate="visible" variants={fadeUp}>
                        <div className="stat-card-header">
                            <span className="stat-label">{m.label}</span>
                            <div className="stat-icon" style={{ background: m.color + '18', color: m.color }}><m.icon size={16} /></div>
                        </div>
                        <div className="stat-value">{m.value}</div>
                    </motion.div>
                ))}
            </div>

            {/* Token Config */}
            {mc && (
                <motion.div className="chart-card" initial="hidden" animate="visible" custom={7} variants={fadeUp}>
                    <h3>Token Configuration</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-4)', padding: 'var(--space-4)' }}>
                        <div><span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Tokens Issued</span><div className="text-mono" style={{ fontSize: 18, fontWeight: 700 }}>{formatTokenAmount(mc.tokensIssued)}</div></div>
                        <div><span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Current Supply</span><div className="text-mono" style={{ fontSize: 18, fontWeight: 700 }}>{formatTokenAmount(mc.currentSupply)}</div></div>
                        <div><span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Transfer Fee</span><div className="text-mono" style={{ fontSize: 18, fontWeight: 700 }}>{bpsToPercent(mc.transferFeeBps).toFixed(1)}%</div></div>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
