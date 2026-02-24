'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Target, Zap, Eye, Users, TrendingUp, Gauge } from 'lucide-react';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    RadialBarChart,
    RadialBar,
    PolarAngleAxis,
} from 'recharts';
import { useRecentTransactions, useViralOracle } from '@/lib/hooks';
import { useWallet } from '@/lib/useWallet';
import { bpsToPercent, formatTokenAmount } from '@/lib/solana';

type CohortBucket = {
    id: 'day-1' | 'day-7' | 'day-30';
    label: string;
    minAge: number;
    maxAge: number;
};

type CohortMetric = {
    id: CohortBucket['id'];
    label: string;
    count: number;
    successRate: number;
    tokenVolume: number;
};

type OracleRecommendation = {
    id: string;
    title: string;
    action: string;
    impact: string;
    priority: 'high' | 'medium' | 'low';
};

const COHORT_BUCKETS: CohortBucket[] = [
    { id: 'day-1', label: '0-24h', minAge: 0, maxAge: 24 * 3600 },
    { id: 'day-7', label: '2-7d', minAge: 2 * 24 * 3600, maxAge: 7 * 24 * 3600 },
    { id: 'day-30', label: '8-30d', minAge: 8 * 24 * 3600, maxAge: 30 * 24 * 3600 },
];

export default function OraclePage() {
    const publicKey = useWallet();
    const oracle = useViralOracle(publicKey);
    const txs = useRecentTransactions(publicKey, 90);
    const [nowUnix, setNowUnix] = useState(() => Math.floor(Date.now() / 1000));
    const dataError = oracle.error || txs.error;

    useEffect(() => {
        const timer = setInterval(() => {
            setNowUnix(Math.floor(Date.now() / 1000));
        }, 30_000);
        return () => clearInterval(timer);
    }, []);

    const kFactor = oracle.data ? oracle.data.kFactor / 100 : 0;
    const isViral = kFactor >= 1.0;

    const funnelPct = oracle.data ? {
        shared: oracle.data.shareRate,
        claimed: oracle.data.claimRate,
        redeemed: oracle.data.firstRedeemRate,
    } : { shared: 0, claimed: 0, redeemed: 0 };

    const funnelData = [
        { stage: 'Shared', rate: funnelPct.shared, fill: 'var(--crimson)' },
        { stage: 'Claimed', rate: funnelPct.claimed, fill: 'var(--jade)' },
        { stage: 'Redeemed', rate: funnelPct.redeemed, fill: 'var(--cloud)' },
    ];

    const timingData = oracle.data ? [
        { phase: 'Share->Claim', hours: Math.round(oracle.data.avgTimeShareToClaimSecs / 3600) },
        { phase: 'Claim->Redeem', hours: Math.round(oracle.data.avgTimeClaimToRedeemSecs / 3600) },
    ] : [];

    const cohortMetrics = useMemo<CohortMetric[]>(() => {
        const events = (txs.data ?? []).filter((tx) => tx.timestamp !== null) as Array<{
            timestamp: number;
            success: boolean;
            amount?: number;
        }>;

        return COHORT_BUCKETS.map((bucket) => {
                const cohortEvents = events.filter((event) => {
                const age = nowUnix - event.timestamp;
                return age >= bucket.minAge && age < bucket.maxAge;
            });
            const successful = cohortEvents.filter((event) => event.success).length;
            const tokenVolume = cohortEvents.reduce((sum, event) => sum + (event.amount ?? 0), 0);
            const successRate = cohortEvents.length > 0
                ? Math.round((successful / cohortEvents.length) * 100)
                : 0;

            return {
                id: bucket.id,
                label: bucket.label,
                count: cohortEvents.length,
                successRate,
                tokenVolume,
            };
        });
    }, [txs.data, nowUnix]);

    const oracleRecommendations = useMemo<OracleRecommendation[]>(() => {
        const recs: OracleRecommendation[] = [];
        const fresh = cohortMetrics.find((item) => item.id === 'day-1');
        const week = cohortMetrics.find((item) => item.id === 'day-7');

        if (!oracle.data) {
            recs.push({
                id: 'seed-data',
                title: 'Build baseline cohort signal',
                action: 'Drive at least 12 live referral loops to unlock actionable oracle trends.',
                impact: 'Forecast confidence +20% to +40%',
                priority: 'high',
            });
        } else {
            if (oracle.data.claimRate < 45) {
                recs.push({
                    id: 'claim-rate',
                    title: 'Improve claim completion',
                    action: 'Use scan-first CTA and remove extra steps between referral click and claim.',
                    impact: 'Claim rate +8% to +18%',
                    priority: 'high',
                });
            }
            if (oracle.data.firstRedeemRate < 30) {
                recs.push({
                    id: 'redeem-rate',
                    title: 'Push faster first redeem',
                    action: 'Run two daily limited-time POS windows with explicit expiry messaging.',
                    impact: 'First redeem rate +10% to +22%',
                    priority: 'medium',
                });
            }
            if (oracle.data.avgTimeClaimToRedeemSecs > 12 * 3600) {
                recs.push({
                    id: 'latency',
                    title: 'Shorten claim-to-redeem latency',
                    action: 'Offer same-day bonus for redemption within 6 hours of claim.',
                    impact: 'Cycle time -20% to -35%',
                    priority: 'medium',
                });
            }
        }

        if (fresh && week && fresh.count < week.count * 0.35) {
            recs.push({
                id: 'fresh-flow',
                title: 'Boost fresh cohort inflow',
                action: 'Launch first-purchase booster campaign to improve new-user intake.',
                impact: 'New cohort volume +12% to +25%',
                priority: 'medium',
            });
        }

        if (recs.length === 0) {
            recs.push({
                id: 'stable',
                title: 'Maintain conversion quality',
                action: 'Keep current funnel and monitor day-1 success rate daily.',
                impact: 'K-factor stability +/-0.05',
                priority: 'low',
            });
        }

        return recs.slice(0, 4);
    }, [oracle.data, cohortMetrics]);

    return (
        <>
            <div className="page-top">
                <h1>Viral Oracle</h1>
                {oracle.data && <div className="pill pill-jade">● {oracle.data.dataPoints} pts</div>}
            </div>

            <div className="page-scroll">
                {dataError && (
                    <div className="scroll-card" style={{ padding: 'var(--s4)', marginBottom: 'var(--s4)', borderColor: 'var(--crimson-soft)' }}>
                        <div style={{ fontSize: 13, color: 'var(--crimson)' }}>
                            Unable to load complete oracle metrics: {dataError}
                        </div>
                    </div>
                )}

                <div className="scroll-card" style={{ marginBottom: 'var(--s4)' }}>
                    <div className="hero-stat">
                        <div className="hero-stat-label">Viral Coefficient</div>
                        <div className="hero-stat-value">
                            {oracle.loading ? '...' : oracle.data ? kFactor.toFixed(2) : '—'}
                        </div>
                        {oracle.data && (
                            <div style={{ marginTop: 'var(--s3)' }}>
                                <span className={`pill ${isViral ? 'pill-jade' : 'pill-gold'}`}>
                                    {isViral ? 'Viral' : 'Sub-Viral'}
                                </span>
                            </div>
                        )}
                        <div className="hero-stat-sub">
                            {oracle.loading ? 'Loading...' : oracle.data ? `Each referrer generates ${kFactor.toFixed(2)} new customers on average` : 'No oracle data yet'}
                        </div>
                    </div>
                </div>

                <div className="section" style={{ marginTop: 0 }}>
                    <div className="section-header">
                        <span className="section-title"><Users size={14} /> Cohort Pulse</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 'var(--s3)' }}>
                        {cohortMetrics.map((cohort) => (
                            <div key={cohort.id} className="stat-card scroll-card">
                                <div className="stat-label">{cohort.label}</div>
                                <div className="stat-value">{cohort.count}</div>
                                <div className="stat-sub">{cohort.successRate}% success</div>
                                <div className="stat-sub">{formatTokenAmount(cohort.tokenVolume)} volume</div>
                            </div>
                        ))}
                    </div>
                </div>

                {oracle.data && funnelPct.shared > 0 && (
                    <>
                        <div className="chart-wrap scroll-card" style={{ marginBottom: 'var(--s4)' }}>
                            <h3><Target size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />Conversion Funnel</h3>
                            <div className="chart-sub">Stage conversion rates (%)</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--s3)' }}>
                                <div style={{ minHeight: 220 }}>
                                    <ResponsiveContainer width="100%" height={220}>
                                        <BarChart data={funnelData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                            <XAxis dataKey="stage" tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fill: 'var(--text-3)', fontSize: 10 }} axisLine={false} tickLine={false} unit="%" />
                                            <Tooltip
                                                cursor={{ fill: 'var(--mist)' }}
                                                content={({ active, payload }) => {
                                                    if (!active || !payload || payload.length === 0) return null;
                                                    return (
                                                        <div className="chart-tooltip">
                                                            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>
                                                                {payload[0].payload.stage}
                                                            </div>
                                                            <div style={{ fontSize: 13, fontWeight: 700 }}>
                                                                {payload[0].value}%
                                                            </div>
                                                        </div>
                                                    );
                                                }}
                                            />
                                            <Bar dataKey="rate" radius={[8, 8, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <div style={{ minHeight: 220 }}>
                                    <ResponsiveContainer width="100%" height={220}>
                                        <RadialBarChart
                                            data={funnelData}
                                            innerRadius="20%"
                                            outerRadius="96%"
                                            startAngle={180}
                                            endAngle={0}
                                            cx="50%"
                                            cy="80%"
                                        >
                                            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                                            <RadialBar dataKey="rate" cornerRadius={8} background />
                                            <Tooltip
                                                content={({ active, payload }) => {
                                                    if (!active || !payload || payload.length === 0) return null;
                                                    return (
                                                        <div className="chart-tooltip">
                                                            <div style={{ fontSize: 12, fontWeight: 700 }}>
                                                                {payload[0].payload.stage}: {payload[0].value}%
                                                            </div>
                                                        </div>
                                                    );
                                                }}
                                            />
                                        </RadialBarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        <div className="chart-wrap scroll-card">
                            <h3><Zap size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />Friction Timing</h3>
                            <div className="chart-sub">Average hours between funnel stages</div>
                            <ResponsiveContainer width="100%" height={180}>
                                <BarChart data={timingData} margin={{ top: 6, right: 10, left: -16, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                    <XAxis dataKey="phase" tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: 'var(--text-3)', fontSize: 10 }} axisLine={false} tickLine={false} unit="h" />
                                    <Tooltip
                                        cursor={{ fill: 'var(--mist)' }}
                                        content={({ active, payload }) => {
                                            if (!active || !payload || payload.length === 0) return null;
                                            return (
                                                <div className="chart-tooltip">
                                                    <div style={{ fontSize: 12, fontWeight: 700 }}>
                                                        {payload[0].payload.phase}
                                                    </div>
                                                    <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
                                                        {payload[0].value} hours
                                                    </div>
                                                </div>
                                            );
                                        }}
                                    />
                                    <Bar dataKey="hours" fill="var(--gold)" radius={[8, 8, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </>
                )}

                <div className="section">
                    <div className="section-header">
                        <span className="section-title"><TrendingUp size={14} /> Actionable Recommendations</span>
                    </div>
                    <div className="scroll-card" style={{ padding: 'var(--s4)' }}>
                        {oracleRecommendations.map((rec, index) => {
                            const priorityClass = rec.priority === 'high'
                                ? 'pill-crimson'
                                : rec.priority === 'medium'
                                    ? 'pill-gold'
                                    : 'pill-jade';

                            return (
                                <div
                                    key={rec.id}
                                    style={{
                                        paddingBottom: index === oracleRecommendations.length - 1 ? 0 : 12,
                                        marginBottom: index === oracleRecommendations.length - 1 ? 0 : 12,
                                        borderBottom: index === oracleRecommendations.length - 1 ? 'none' : '1px solid var(--border)',
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                        <div style={{ fontSize: 14, fontWeight: 700 }}>{rec.title}</div>
                                        <span className={`pill ${priorityClass}`}>{rec.priority}</span>
                                    </div>
                                    <div style={{ marginTop: 6, fontSize: 13, color: 'var(--text-2)' }}>{rec.action}</div>
                                    <div style={{ marginTop: 6, fontSize: 12, color: 'var(--gold)', fontWeight: 700 }}>
                                        Expected impact: {rec.impact}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {oracle.data && (
                    <div className="section">
                        <div className="section-header"><span className="section-title"><Gauge size={14} /> Metrics</span></div>
                        <div className="scroll-card" style={{ padding: 'var(--s4)' }}>
                            <div className="metric-row"><span className="metric-label">K-Factor</span><span className="metric-value">{kFactor.toFixed(2)}</span></div>
                            <div className="metric-row"><span className="metric-label">Median Refs/User</span><span className="metric-value">{oracle.data.medianReferralsPerUser}</span></div>
                            <div className="metric-row"><span className="metric-label">P90 Refs/User</span><span className="metric-value">{oracle.data.p90ReferralsPerUser}</span></div>
                            <div className="metric-row"><span className="metric-label">Avg Share to Claim</span><span className="metric-value">{Math.round(oracle.data.avgTimeShareToClaimSecs / 3600)}h</span></div>
                            <div className="metric-row"><span className="metric-label">Avg Claim to Redeem</span><span className="metric-value">{Math.round(oracle.data.avgTimeClaimToRedeemSecs / 3600)}h</span></div>
                            <div className="metric-row"><span className="metric-label">vs Google Ads</span><span className="metric-value">{bpsToPercent(oracle.data.vsGoogleAdsEfficiencyBps)}%</span></div>
                            <div className="metric-row"><span className="metric-label">Data Points</span><span className="metric-value">{oracle.data.dataPoints}</span></div>
                            <div className="metric-row"><span className="metric-label">Last Computed</span><span className="metric-value">{new Date(oracle.data.computedAt * 1000).toLocaleString()}</span></div>
                        </div>
                    </div>
                )}

                {!oracle.loading && !oracle.data && (
                    <div className="empty-state">
                        <div className="empty-state-icon"><Eye size={24} color="var(--text-3)" /></div>
                        <h3>Oracle Awaits</h3>
                        <p>The Viral Oracle will compute your K-Factor once referral data flows on-chain.</p>
                    </div>
                )}

                <div style={{ height: 'var(--s8)' }} />
            </div>
        </>
    );
}
