'use client';

import React from 'react';
import { Network, Users, TrendingUp, Sparkles } from 'lucide-react';
import { useNetworkGraph, useMerchantConfig } from '@/lib/hooks';
import { useWallet } from '@/lib/useWallet';
import { formatTokenAmount } from '@/lib/solana';

type CohortLane = {
    id: 'seed' | 'growth' | 'champion';
    label: string;
    count: number;
    sharePct: number;
    avgRefs: number;
    tokenFlow: number;
};

type NetworkRecommendation = {
    id: string;
    title: string;
    action: string;
    impact: string;
    priority: 'high' | 'medium' | 'low';
};

const ONE_TOKEN = 1_000_000_000;
const SEED_MAX = 5 * ONE_TOKEN;
const GROWTH_MAX = 25 * ONE_TOKEN;

export default function NetworkPage() {
    const publicKey = useWallet();
    const config = useMerchantConfig(publicKey);
    const graph = useNetworkGraph(config.data?.mint ?? null);
    const dataError = config.error || graph.error;

    const nodes = graph.data?.nodes ?? [];
    const edges = graph.data?.edges ?? [];

    // Sort nodes by total lifetime tokens (best referrers first)
    const sortedNodes = [...nodes].sort((a, b) => b.totalLifetime - a.totalLifetime);
    const visibleNodes = sortedNodes.slice(0, 28);
    const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));
    const nodeMap = new Map(nodes.map((node) => [node.id, node]));
    const visibleEdges = edges
        .filter((edge) => visibleNodeIds.has(edge.from) && visibleNodeIds.has(edge.to))
        .sort((a, b) => b.tokensAttributed - a.tokensAttributed)
        .slice(0, 80);
    const maxEdgeFlow = visibleEdges.reduce((max, edge) => Math.max(max, edge.tokensAttributed), 1);

    const cohortLanes: CohortLane[] = (() => {
        const seed = nodes.filter((node) => node.totalLifetime < SEED_MAX);
        const growth = nodes.filter((node) => node.totalLifetime >= SEED_MAX && node.totalLifetime < GROWTH_MAX);
        const champion = nodes.filter((node) => node.totalLifetime >= GROWTH_MAX);
        const totalNodes = Math.max(nodes.length, 1);

        const toLane = (id: CohortLane['id'], label: string, cohortNodes: typeof nodes): CohortLane => ({
            id,
            label,
            count: cohortNodes.length,
            sharePct: Math.round((cohortNodes.length / totalNodes) * 100),
            avgRefs: cohortNodes.length > 0
                ? Number((cohortNodes.reduce((sum, node) => sum + node.referrerCount, 0) / cohortNodes.length).toFixed(1))
                : 0,
            tokenFlow: cohortNodes.reduce((sum, node) => sum + node.totalLifetime, 0),
        });

        return [
            toLane('seed', 'Seed (0-5 tokens)', seed),
            toLane('growth', 'Growth (5-25 tokens)', growth),
            toLane('champion', 'Champion (25+ tokens)', champion),
        ];
    })();

    const networkRecommendations: NetworkRecommendation[] = (() => {
        const recs: NetworkRecommendation[] = [];
        const seed = cohortLanes.find((lane) => lane.id === 'seed');
        const growth = cohortLanes.find((lane) => lane.id === 'growth');
        const champion = cohortLanes.find((lane) => lane.id === 'champion');

        if (seed && seed.sharePct > 60) {
            recs.push({
                id: 'seed-heavy',
                title: 'Convert seed cohort faster',
                action: 'Run first-purchase booster to move new wallets into growth tier in <7 days.',
                impact: 'Claim conversions +10% to +22%',
                priority: 'high',
            });
        }

        if (growth && growth.count > 0 && growth.avgRefs < 1.2) {
            recs.push({
                id: 'growth-share',
                title: 'Increase growth cohort sharing',
                action: 'Reward second referral for wallets with at least one successful redemption.',
                impact: 'K-factor +0.08 to +0.20',
                priority: 'medium',
            });
        }

        if (champion && champion.count < 3 && nodes.length >= 10) {
            recs.push({
                id: 'champion-depth',
                title: 'Build ambassador depth',
                action: 'Create champion perks and priority payouts for top referrers.',
                impact: 'Top-tier retention +12% to +28%',
                priority: 'medium',
            });
        }

        if (edges.length > 0 && edges.length / Math.max(nodes.length, 1) < 1.5) {
            recs.push({
                id: 'edge-density',
                title: 'Raise graph connectivity',
                action: 'Promote cross-referral events to increase referral edges per active wallet.',
                impact: 'Edge density +15% to +35%',
                priority: 'low',
            });
        }

        if (recs.length === 0) {
            recs.push({
                id: 'healthy',
                title: 'Network is balanced',
                action: 'Keep current campaign cadence and monitor lane share shifts daily.',
                impact: 'Volatility -10% to -20%',
                priority: 'low',
            });
        }

        return recs.slice(0, 4);
    })();

    return (
        <>
            <div className="page-top">
                <h1>Network</h1>
                {nodes.length > 0 && <div className="pill pill-gold"><Users size={12} /> {nodes.length}</div>}
            </div>

            <div className="page-scroll">
                {dataError && (
                    <div className="scroll-card" style={{ padding: 'var(--s4)', marginBottom: 'var(--s4)', borderColor: 'var(--crimson-soft)' }}>
                        <div style={{ fontSize: 13, color: 'var(--crimson)' }}>
                            Network data degraded: {dataError}
                        </div>
                    </div>
                )}

                {/* Stats */}
                <div className="stats-grid" style={{ marginBottom: 'var(--s4)' }}>
                    <div className="stat-card scroll-card">
                        <div className="stat-label">Nodes</div>
                        <div className="stat-value">{graph.loading ? '...' : nodes.length}</div>
                    </div>
                    <div className="stat-card scroll-card">
                        <div className="stat-label">Edges</div>
                        <div className="stat-value">{graph.loading ? '...' : edges.length}</div>
                    </div>
                    <div className="stat-card scroll-card">
                        <div className="stat-label">Avg Refs</div>
                        <div className="stat-value">{nodes.length > 0 ? (nodes.reduce((s, n) => s + n.referrerCount, 0) / nodes.length).toFixed(1) : '—'}</div>
                    </div>
                    <div className="stat-card scroll-card">
                        <div className="stat-label">Total Flow</div>
                        <div className="stat-value">{edges.length > 0 ? formatTokenAmount(edges.reduce((s, e) => s + e.tokensAttributed, 0)) : '—'}</div>
                    </div>
                </div>

                <div className="section" style={{ marginTop: 0 }}>
                    <div className="section-header">
                        <span className="section-title"><Sparkles size={14} /> Cohort Lanes</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--s3)' }}>
                        {cohortLanes.map((lane) => (
                            <div key={lane.id} className="stat-card scroll-card">
                                <div className="stat-label">{lane.label}</div>
                                <div className="stat-value">{lane.count}</div>
                                <div className="stat-sub">{lane.sharePct}% of wallets</div>
                                <div className="stat-sub">{lane.avgRefs.toFixed(1)} avg refs</div>
                                <div className="stat-sub">{formatTokenAmount(lane.tokenFlow)} flow</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Token Distribution */}
                {nodes.length > 0 && (
                    <div className="scroll-card" style={{ padding: 'var(--s5)', marginBottom: 'var(--s4)' }}>
                        <h3 style={{ marginBottom: 'var(--s3)' }}>
                            <Network size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />
                            Token Distribution
                        </h3>
                        <div className="metric-row">
                            <span className="metric-label">Total Gen-1 Tokens</span>
                            <span className="metric-value">{formatTokenAmount(nodes.reduce((s, n) => s + n.gen1Balance, 0))}</span>
                        </div>
                        <div className="metric-row">
                            <span className="metric-label">Total Gen-2 Tokens</span>
                            <span className="metric-value">{formatTokenAmount(nodes.reduce((s, n) => s + n.gen2Balance, 0))}</span>
                        </div>
                        <div className="metric-row">
                            <span className="metric-label">Dead / Expired</span>
                            <span className="metric-value">{formatTokenAmount(nodes.reduce((s, n) => s + n.deadBalance, 0))}</span>
                        </div>
                    </div>
                )}

                {/* Live Graph */}
                {visibleNodes.length > 0 && (
                    <div className="chart-wrap scroll-card" style={{ marginBottom: 'var(--s4)' }}>
                        <h3><Network size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />Live Referral Graph</h3>
                        <div className="chart-sub">Rendering top {visibleNodes.length} active wallets</div>
                        <div style={{ width: '100%', height: 340, borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--mist)' }}>
                            <svg viewBox="0 0 800 600" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
                                <defs>
                                    <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
                                        <stop offset="0%" stopColor="rgba(212,168,67,0.38)" />
                                        <stop offset="100%" stopColor="rgba(212,168,67,0)" />
                                    </radialGradient>
                                </defs>
                                {visibleEdges.map((edge) => {
                                    const fromNode = nodeMap.get(edge.from);
                                    const toNode = nodeMap.get(edge.to);
                                    if (!fromNode || !toNode) return null;
                                    const intensity = Math.max(0.18, edge.tokensAttributed / maxEdgeFlow);
                                    return (
                                        <line
                                            key={`${edge.from}-${edge.to}`}
                                            x1={fromNode.x}
                                            y1={fromNode.y}
                                            x2={toNode.x}
                                            y2={toNode.y}
                                            stroke={`rgba(59,155,120,${intensity.toFixed(3)})`}
                                            strokeWidth={1 + intensity * 2.2}
                                        />
                                    );
                                })}
                                {visibleNodes.map((node) => (
                                    <g key={node.id}>
                                        <circle cx={node.x} cy={node.y} r={18} fill="url(#nodeGlow)" />
                                        <circle cx={node.x} cy={node.y} r={5.5} fill="var(--gold)" />
                                    </g>
                                ))}
                            </svg>
                        </div>
                    </div>
                )}

                <div className="section">
                    <div className="section-header">
                        <span className="section-title"><TrendingUp size={14} /> Actionable Recommendations</span>
                    </div>
                    <div className="scroll-card" style={{ padding: 'var(--s4)' }}>
                        {networkRecommendations.map((rec, index) => {
                            const priorityClass = rec.priority === 'high'
                                ? 'pill-crimson'
                                : rec.priority === 'medium'
                                    ? 'pill-gold'
                                    : 'pill-jade';

                            return (
                                <div
                                    key={rec.id}
                                    style={{
                                        paddingBottom: index === networkRecommendations.length - 1 ? 0 : 12,
                                        marginBottom: index === networkRecommendations.length - 1 ? 0 : 12,
                                        borderBottom: index === networkRecommendations.length - 1 ? 'none' : '1px solid var(--border)',
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

                {/* Top Nodes */}
                {sortedNodes.length > 0 && (
                    <div className="section">
                        <div className="section-header">
                            <span className="section-title"><TrendingUp size={14} /> Top Nodes</span>
                        </div>
                        <div className="list-card">
                            {sortedNodes.slice(0, 8).map((n, i) => (
                                <div key={n.id} className="list-item">
                                    <div className="list-item-icon" style={{
                                        background: i < 3 ? 'var(--gold-soft)' : 'var(--mist)',
                                        color: i < 3 ? 'var(--gold)' : 'var(--text-2)',
                                        borderRadius: 'var(--radius-full)', fontWeight: 800, fontSize: 14,
                                    }}>
                                        {i + 1}
                                    </div>
                                    <div className="list-item-content">
                                        <div className="list-item-title">{n.address.substring(0, 8)}...{n.address.slice(-4)}</div>
                                        <div className="list-item-sub">
                                            {n.referrerCount} refs · POI: {n.poiScore}
                                        </div>
                                    </div>
                                    <div className="list-item-right">
                                        <div className="list-item-amount" style={{ color: 'var(--jade)' }}>{formatTokenAmount(n.totalLifetime)}</div>
                                        <div className="list-item-time">lifetime</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty */}
                {!graph.loading && nodes.length === 0 && (
                    <div className="empty-state">
                        <div className="empty-state-icon"><Network size={24} color="var(--text-3)" /></div>
                        <h3>Network Forming</h3>
                        <p>Once referrals flow on-chain, the network graph will visualize all connections.</p>
                    </div>
                )}

                <div style={{ height: 'var(--s8)' }} />
            </div>
        </>
    );
}
