'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, AreaChart, Area,
} from 'recharts';
import {
  TrendingUp, Users, Coins, Shield, ArrowUpRight, ArrowDownRight,
  Activity, Clock, ExternalLink,
} from 'lucide-react';
import { useMerchantConfig, useViralOracle, useMerchantReputation, useRecentTransactions } from '@/lib/hooks';
import { formatTokenAmount, shortenAddress, explorerUrl, fixedToDecimal, bpsToPercent } from '@/lib/solana';
import { useWallet } from '@/lib/useWallet';

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.4, ease: 'easeOut' as const },
  }),
};

export default function OverviewPage() {
  const wallet = useWallet();
  const config = useMerchantConfig(wallet);
  const oracle = useViralOracle(wallet);
  const reputation = useMerchantReputation(wallet);
  const txns = useRecentTransactions(wallet, 20);

  // Derive stats from on-chain data (fallback to zero when no data)
  const mc = config.data;
  const vo = oracle.data;
  const mr = reputation.data;

  const stats = [
    {
      label: 'Current Supply',
      value: mc ? formatTokenAmount(mc.currentSupply) : '—',
      change: mc?.isActive ? 'Active' : 'Inactive',
      positive: mc?.isActive ?? false,
      icon: Coins,
      color: 'var(--accent-primary)',
    },
    {
      label: 'K-Factor',
      value: vo ? fixedToDecimal(vo.kFactor).toFixed(2) : '—',
      change: vo && vo.kFactor > 10000 ? 'Super-Viral' : 'Growing',
      positive: vo ? vo.kFactor > 10000 : false,
      icon: TrendingUp,
      color: 'var(--success)',
    },
    {
      label: 'Commission Rate',
      value: mc ? `${bpsToPercent(mc.commissionRateBps).toFixed(1)}%` : '—',
      change: mc ? `${mc.tokenExpiryDays}d expiry` : '',
      positive: true,
      icon: Users,
      color: 'var(--accent-secondary)',
    },
    {
      label: 'Reputation Score',
      value: mr ? `${mr.reputationScore}` : '—',
      change: mr ? `Suspicion: ${mr.suspicionScore}` : '',
      positive: mr ? mr.suspicionScore < 30 : true,
      icon: Shield,
      color: '#8B5CF6',
    },
  ];

  // Build chart data from oracle funnel metrics
  const chartData = vo ? [
    { name: 'Shares', value: fixedToDecimal(vo.shareRate) * 100 },
    { name: 'Claims', value: fixedToDecimal(vo.claimRate) * 100 },
    { name: 'Redeems', value: fixedToDecimal(vo.firstRedeemRate) * 100 },
  ] : [
    { name: 'Shares', value: 0 },
    { name: 'Claims', value: 0 },
    { name: 'Redeems', value: 0 },
  ];

  // Activity feed from recent transactions
  const activities = txns.data?.slice(0, 8).map((tx) => ({
    id: tx.signature.slice(0, 8),
    label: tx.description,
    time: tx.timestamp ? new Date(tx.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—',
    positive: tx.success,
    link: explorerUrl(tx.signature, 'tx'),
  })) ?? [];

  const isLoading = config.loading || oracle.loading;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Overview</h1>
          <p>Dashboard for {wallet ? shortenAddress(wallet.toBase58(), 6) : 'your merchant'}</p>
        </div>
        {isLoading && <span className="badge badge-warning" style={{ alignSelf: 'flex-start' }}>Loading on-chain data…</span>}
        {config.error && <span className="badge badge-danger" style={{ alignSelf: 'flex-start' }}>RPC Error</span>}
      </div>

      {/* Stat Cards */}
      <div className="stats-grid">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} className="stat-card" custom={i} initial="hidden" animate="visible" variants={cardVariants}>
            <div className="stat-card-header">
              <span className="stat-label">{stat.label}</span>
              <div className="stat-icon" style={{ background: stat.color + '18', color: stat.color }}>
                <stat.icon size={18} />
              </div>
            </div>
            <div className="stat-value">{stat.value}</div>
            <div className={`stat-change ${stat.positive ? 'positive' : 'negative'}`}>
              {stat.positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {stat.change}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="charts-row">
        <div className="chart-card">
          <h3>Funnel Conversion</h3>
          <p className="chart-subtitle">Share → Claim → Redeem (% rate from ViralOracle)</p>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-secondary)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} unit="%" />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 8, fontSize: 13 }} />
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent-primary)" />
                    <stop offset="100%" stopColor="var(--accent-secondary)" />
                  </linearGradient>
                </defs>
                <Bar dataKey="value" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <h3>Tokens Issued</h3>
          <p className="chart-subtitle">
            {mc ? `${formatTokenAmount(mc.tokensIssued)} total issued, ${formatTokenAmount(mc.currentSupply)} circulating` : 'Connect merchant to see data'}
          </p>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-secondary)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 8, fontSize: 13 }} />
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--success)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--success)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="value" stroke="var(--success)" fill="url(#areaGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Activity Feed + Protocol Health */}
      <div className="charts-row">
        <div className="chart-card" style={{ flex: 1 }}>
          <h3><Activity size={16} style={{ verticalAlign: '-3px', marginRight: 8 }} />Recent Transactions</h3>
          <div className="feed-list">
            {activities.length === 0 && !txns.loading && (
              <p style={{ color: 'var(--text-tertiary)', padding: 'var(--space-4)', textAlign: 'center', fontSize: 14 }}>
                No transactions found. Deploy merchant to devnet to see live data.
              </p>
            )}
            {activities.map((item) => (
              <div key={item.id} className="feed-item">
                <div className={`feed-dot ${item.positive ? 'positive' : 'negative'}`} />
                <div className="feed-content">
                  <span className="feed-label">{item.label}</span>
                  <span className="feed-time"><Clock size={10} /> {item.time}</span>
                </div>
                <a href={item.link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)' }}>
                  <ExternalLink size={14} />
                </a>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-card" style={{ flex: 0.6 }}>
          <h3><Shield size={16} style={{ verticalAlign: '-3px', marginRight: 8 }} />Protocol Health</h3>
          <div style={{ padding: 'var(--space-4)' }}>
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                <span>Reputation</span>
                <span className="text-mono">{mr?.reputationScore ?? '—'} / 100</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${mr?.reputationScore ?? 0}%`, background: 'var(--success)' }} />
              </div>
            </div>
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                <span>Suspicion</span>
                <span className="text-mono">{mr?.suspicionScore ?? '—'} / 100</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${mr?.suspicionScore ?? 0}%`, background: mr && mr.suspicionScore > 30 ? 'var(--danger)' : 'var(--success)' }} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                <span>Business Hours %</span>
                <span className="text-mono">{mr ? bpsToPercent(mr.pctRedemptionsInBusinessHours).toFixed(0) + '%' : '—'}</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${mr ? bpsToPercent(mr.pctRedemptionsInBusinessHours) : 0}%`, background: 'var(--accent-primary)' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
