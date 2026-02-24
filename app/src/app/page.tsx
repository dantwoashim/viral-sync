'use client';

import React from 'react';
import Link from 'next/link';
import {
  ComposedChart, Area, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  Coins, TrendingUp, Users, Shield, Activity, Clock, Bell, Rocket, ScanLine,
} from 'lucide-react';
import { useMerchantConfig, useViralOracle, useMerchantReputation, useRecentTransactions } from '@/lib/hooks';
import { useWallet } from '@/lib/useWallet';
import { formatTokenAmount, bpsToPercent, shortenAddress } from '@/lib/solana';

export default function DashboardPage() {
  const publicKey = useWallet();
  const config = useMerchantConfig(publicKey);
  const oracle = useViralOracle(publicKey);
  const rep = useMerchantReputation(publicKey);
  const txs = useRecentTransactions(publicKey, 5);
  const dataError = config.error || oracle.error || rep.error || txs.error;

  const kFactor = oracle.data ? (oracle.data.kFactor / 100).toFixed(2) : '—';
  const supply = config.data ? formatTokenAmount(config.data.currentSupply) : '—';
  const commission = config.data ? bpsToPercent(config.data.commissionRateBps) + '%' : '—';
  const reputation = rep.data ? rep.data.reputationScore.toString() : '—';

  const funnelData = oracle.data ? [
    { name: 'Share', rate: oracle.data.shareRate, target: 100 },
    { name: 'Claim', rate: oracle.data.claimRate, target: 70 },
    { name: 'Redeem', rate: oracle.data.firstRedeemRate, target: 40 },
  ] : [];

  const tacticalNotes = [
    oracle.data && oracle.data.kFactor < 100 ? 'K-factor below 1.0. Boost referral reward and simplify claim flow.' : null,
    oracle.data && oracle.data.claimRate < 45 ? 'Claim rate is low. Push claim CTA directly from scanned links.' : null,
    rep.data && rep.data.suspicionScore > 45 ? 'Risk score elevated. Keep redemptions in business hours and geofence attested.' : null,
  ].filter(Boolean) as string[];

  return (
    <>
      <div className="page-top">
        <div>
          <h1>Viral Sync</h1>
          {publicKey && <div className="page-top-sub">{shortenAddress(publicKey.toBase58())}</div>}
        </div>
        <div style={{ display: 'flex', gap: 'var(--s2)', alignItems: 'center' }}>
          <div className="pill pill-jade">● Live</div>
          <Bell size={18} color="var(--text-2)" />
        </div>
      </div>

      <div className="page-scroll">
        {dataError && (
          <div className="scroll-card" style={{ padding: 'var(--s4)', marginBottom: 'var(--s4)', borderColor: 'var(--crimson-soft)' }}>
            <div style={{ fontSize: 13, color: 'var(--crimson)' }}>
              Partial data unavailable: {dataError}
            </div>
          </div>
        )}

        {/* Hero */}
        <div className="scroll-card" style={{ marginBottom: 'var(--s4)' }}>
          <div className="hero-stat">
            <div className="hero-stat-label">Token Supply</div>
            <div className="hero-stat-value">{supply}</div>
            <div className="hero-stat-sub">
              {config.loading ? 'Loading from chain...' : config.data ? `K-Factor: ${kFactor}` : 'Connect wallet to view'}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card scroll-card">
            <div className="stat-icon" style={{ background: 'var(--jade-soft)', color: 'var(--jade)' }}><Coins size={16} /></div>
            <div className="stat-label">Supply</div>
            <div className="stat-value">{supply}</div>
          </div>
          <div className="stat-card scroll-card">
            <div className="stat-icon" style={{ background: 'var(--gold-soft)', color: 'var(--gold)' }}><TrendingUp size={16} /></div>
            <div className="stat-label">K-Factor</div>
            <div className="stat-value">{kFactor}</div>
            <div className="stat-sub">{oracle.data && oracle.data.kFactor >= 100 ? 'Viral' : 'Growing'}</div>
          </div>
          <div className="stat-card scroll-card">
            <div className="stat-icon" style={{ background: 'var(--dawn-soft)', color: 'var(--dawn)' }}><Users size={16} /></div>
            <div className="stat-label">Commission</div>
            <div className="stat-value">{commission}</div>
            <div className="stat-sub">{config.data ? `${config.data.tokenExpiryDays}d expiry` : ''}</div>
          </div>
          <div className="stat-card scroll-card">
            <div className="stat-icon" style={{ background: 'var(--cloud-soft)', color: 'var(--cloud)' }}><Shield size={16} /></div>
            <div className="stat-label">Reputation</div>
            <div className="stat-value">{reputation}</div>
            <div className="stat-sub">{rep.data ? (rep.data.reputationScore >= 80 ? 'Excellent' : 'Fair') : ''}</div>
          </div>
        </div>

        <div className="section">
          <div className="section-header">
            <span className="section-title"><Rocket size={14} /> Quick Ops</span>
          </div>
          <div className="stats-grid">
            <Link href="/launchpad" className="stat-card scroll-card" style={{ display: 'block' }}>
              <div className="stat-icon" style={{ background: 'var(--gold-soft)', color: 'var(--gold)' }}><Rocket size={16} /></div>
              <div className="stat-label">Command Center</div>
              <div className="stat-value" style={{ fontSize: 18 }}>Launchpad</div>
              <div className="stat-sub">Readiness checks + blockers</div>
            </Link>
            <Link href="/pos" className="stat-card scroll-card" style={{ display: 'block' }}>
              <div className="stat-icon" style={{ background: 'var(--jade-soft)', color: 'var(--jade)' }}><ScanLine size={16} /></div>
              <div className="stat-label">Retail Flow</div>
              <div className="stat-value" style={{ fontSize: 18 }}>POS</div>
              <div className="stat-sub">Live scan + transaction feed</div>
            </Link>
          </div>
        </div>

        {tacticalNotes.length > 0 && (
          <div className="section">
            <div className="section-header">
              <span className="section-title"><Shield size={14} /> Tactical Notes</span>
            </div>
            <div className="scroll-card" style={{ padding: 'var(--s4)' }}>
              {tacticalNotes.map((note) => (
                <div key={note} className="metric-row">
                  <span className="metric-label" style={{ color: 'var(--text-1)' }}>{note}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Funnel */}
        {funnelData.length > 0 && funnelData[0].rate > 0 && (
          <div className="section">
            <div className="chart-wrap scroll-card">
              <h3>Conversion Funnel</h3>
              <div className="chart-sub">Share to Claim to Redeem performance versus baseline</div>
              <ResponsiveContainer width="100%" height={180}>
                <ComposedChart data={funnelData} margin={{ top: 10, right: 8, left: -14, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-3)', fontSize: 10 }} axisLine={false} tickLine={false} unit="%" />
                  <Tooltip
                    cursor={{ fill: 'var(--mist)' }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload || payload.length === 0) return null;
                      const value = payload.find((entry) => entry.dataKey === 'rate')?.value;
                      const baseline = payload.find((entry) => entry.dataKey === 'target')?.value;
                      return (
                        <div className="chart-tooltip">
                          <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>{label}</div>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>
                            {value}% current
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
                            Baseline: {baseline}%
                          </div>
                        </div>
                      );
                    }}
                  />
                  <defs>
                    <linearGradient id="funnelG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--jade)" />
                      <stop offset="100%" stopColor="#2D7A60" />
                    </linearGradient>
                    <linearGradient id="targetG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--gold)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="target" stroke="transparent" fill="url(#targetG)" />
                  <Bar dataKey="rate" fill="url(#funnelG)" radius={[6, 6, 0, 0]} />
                  <Line type="monotone" dataKey="rate" stroke="var(--gold)" strokeWidth={2} dot={{ r: 3, fill: 'var(--gold)' }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Activity */}
        <div className="section">
          <div className="section-header">
            <span className="section-title"><Activity size={14} /> Recent Activity</span>
          </div>
          {txs.loading ? (
            <div><div className="loading-pulse" style={{ height: 52, marginBottom: 4 }} /><div className="loading-pulse" style={{ height: 52, marginBottom: 4 }} /><div className="loading-pulse" style={{ height: 52 }} /></div>
          ) : txs.data && txs.data.length > 0 ? (
            <div className="list-card">
              {txs.data.map((tx) => (
                <div key={tx.signature} className="list-item">
                  <div className="list-item-icon" style={{ background: 'var(--jade-soft)', color: 'var(--jade)' }}>
                    <Activity size={16} />
                  </div>
                  <div className="list-item-content">
                    <div className="list-item-title">{tx.type}</div>
                    <div className="list-item-sub">
                      <Clock size={9} /> {tx.timestamp ? new Date(tx.timestamp * 1000).toLocaleTimeString() : 'Pending confirmation'}
                    </div>
                  </div>
                  <div className="list-item-right">
                    <div className="list-item-amount">{tx.amount ? formatTokenAmount(tx.amount) : '—'}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon"><Activity size={24} color="var(--text-3)" /></div>
              <h3>No activity yet</h3>
              <p>Transactions will appear here once the protocol is active on-chain.</p>
            </div>
          )}
        </div>

        {/* Protocol Health */}
        {rep.data && (
          <div className="section" style={{ marginBottom: 'var(--s8)' }}>
            <div className="section-header"><span className="section-title"><Shield size={14} /> Protocol Health</span></div>
            <div className="scroll-card" style={{ padding: 'var(--s4)' }}>
              <div style={{ marginBottom: 'var(--s4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                  <span style={{ color: 'var(--text-2)' }}>Reputation</span>
                  <span className="text-mono" style={{ fontWeight: 700 }}>{rep.data.reputationScore} / 100</span>
                </div>
                <div className="progress"><div className="progress-fill" style={{ width: `${rep.data.reputationScore}%`, background: 'var(--jade)' }} /></div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                  <span style={{ color: 'var(--text-2)' }}>Suspicion</span>
                  <span className="text-mono" style={{ fontWeight: 700 }}>{rep.data.suspicionScore} / 100</span>
                </div>
                <div className="progress"><div className="progress-fill" style={{ width: `${rep.data.suspicionScore}%`, background: rep.data.suspicionScore > 50 ? 'var(--crimson)' : 'var(--jade)' }} /></div>
              </div>
            </div>
          </div>
        )}

        <div style={{ height: 'var(--s8)' }} />
      </div>
    </>
  );
}
