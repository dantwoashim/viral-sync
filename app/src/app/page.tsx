'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  Coins, TrendingUp, Users, Shield, ArrowUpRight, ArrowDownRight,
  Activity, Clock, ExternalLink, Bell,
} from 'lucide-react';

// ── Demo Data ──
const stats = [
  { label: 'Supply', value: '142.5K', change: '+12.3%', up: true, icon: Coins, color: 'var(--accent)', bg: 'var(--accent-soft)' },
  { label: 'K-Factor', value: '1.47', change: 'Super-Viral', up: true, icon: TrendingUp, color: 'var(--success)', bg: 'var(--success-soft)' },
  { label: 'Commission', value: '5.0%', change: '30d expiry', up: true, icon: Users, color: 'var(--accent-2)', bg: 'var(--accent-2-soft)' },
  { label: 'Reputation', value: '94', change: 'Excellent', up: true, icon: Shield, color: 'var(--purple)', bg: 'var(--purple-soft)' },
];

const funnelData = [
  { name: 'Shared', rate: 78 },
  { name: 'Claimed', rate: 45 },
  { name: 'Redeemed', rate: 23 },
];

const recentTx = [
  { id: '1', label: 'Aayush claimed referral', time: '2m ago', amount: '+120', positive: true },
  { id: '2', label: 'Sita redeemed tokens', time: '8m ago', amount: '-500', positive: false },
  { id: '3', label: 'Hari shared to Gita', time: '15m ago', amount: '+60', positive: true },
  { id: '4', label: 'Commission paid to Ram', time: '22m ago', amount: '-25', positive: false },
  { id: '5', label: 'New user onboarded', time: '31m ago', amount: '+200', positive: true },
];

const fade = (i: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4, ease: 'easeOut' as const } },
});

export default function DashboardPage() {
  return (
    <>
      {/* Header */}
      <div className="page-top">
        <h1>Viral Sync</h1>
        <div className="page-top-actions">
          <div className="pill pill-success">● Live</div>
          <Bell size={20} color="var(--text-secondary)" />
        </div>
      </div>

      <div className="page-scroll">
        {/* Hero K-Factor */}
        <motion.div {...fade(0)} className="hero-stat" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="hero-stat-label">Total Revenue</div>
          <div className="hero-stat-value glow-accent">$12.4K</div>
          <div className="hero-stat-sub">
            <span className="pill pill-success" style={{ marginRight: 8 }}>
              <ArrowUpRight size={12} /> +23.5%
            </span>
            vs last month
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div {...fade(1)} className="stats-grid">
          {stats.map((s) => (
            <div key={s.label} className="stat-card glass">
              <div className="stat-icon" style={{ background: s.bg, color: s.color }}>
                <s.icon size={18} />
              </div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
              <div className={`stat-change ${s.up ? 'up' : 'down'}`}>
                {s.up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                {s.change}
              </div>
            </div>
          ))}
        </motion.div>

        {/* Funnel Chart */}
        <motion.div {...fade(2)} className="section">
          <div className="chart-wrap glass">
            <h3>Conversion Funnel</h3>
            <div className="chart-sub">Share → Claim → Redeem rates</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={funnelData} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="name" tick={{ fill: 'rgba(245,245,247,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(245,245,247,0.38)', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip contentStyle={{ background: 'rgba(18,18,28,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: 13 }} />
                <defs>
                  <linearGradient id="barG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" />
                    <stop offset="100%" stopColor="#D4654A" />
                  </linearGradient>
                </defs>
                <Bar dataKey="rate" fill="url(#barG)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div {...fade(3)} className="section">
          <div className="section-header">
            <span className="section-title">
              <Activity size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} />
              Recent Activity
            </span>
            <span className="section-action">See All</span>
          </div>
          <div className="list-card">
            {recentTx.map((tx) => (
              <div key={tx.id} className="list-item">
                <div className="list-item-icon" style={{ background: tx.positive ? 'var(--success-soft)' : 'var(--accent-soft)', color: tx.positive ? 'var(--success)' : 'var(--accent)' }}>
                  {tx.positive ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                </div>
                <div className="list-item-content">
                  <div className="list-item-title">{tx.label}</div>
                  <div className="list-item-sub"><Clock size={10} /> {tx.time}</div>
                </div>
                <div className="list-item-right">
                  <div className="list-item-amount" style={{ color: tx.positive ? 'var(--success)' : 'var(--text-secondary)' }}>
                    {tx.amount}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Protocol Health */}
        <motion.div {...fade(4)} className="section" style={{ marginBottom: 'var(--space-8)' }}>
          <div className="section-header">
            <span className="section-title">
              <Shield size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} />
              Protocol Health
            </span>
          </div>
          <div className="glass" style={{ padding: 'var(--space-4)' }}>
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Reputation</span>
                <span className="text-mono" style={{ fontWeight: 700 }}>94 / 100</span>
              </div>
              <div className="progress"><div className="progress-fill" style={{ width: '94%', background: 'var(--success)' }} /></div>
            </div>
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Suspicion</span>
                <span className="text-mono" style={{ fontWeight: 700 }}>3 / 100</span>
              </div>
              <div className="progress"><div className="progress-fill" style={{ width: '3%', background: 'var(--success)' }} /></div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Business Hours</span>
                <span className="text-mono" style={{ fontWeight: 700 }}>87%</span>
              </div>
              <div className="progress"><div className="progress-fill" style={{ width: '87%', background: 'var(--accent)' }} /></div>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
