'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Shield, AlertTriangle, Clock, Lock, Unlock,
    ChevronDown, ChevronUp, ExternalLink,
} from 'lucide-react';
import { useDisputeRecords, useMerchantReputation, useMerchantBond } from '@/lib/hooks';
import { shortenAddress, lamportsToSol, explorerUrl, bpsToPercent } from '@/lib/solana';
import { useWallet } from '@/lib/useWallet';

export default function DisputesPage() {
    const wallet = useWallet();
    const reputation = useMerchantReputation(wallet);
    const bond = useMerchantBond(wallet);
    const disputes = useDisputeRecords(wallet);
    const [expanded, setExpanded] = useState<string | null>(null);

    const mr = reputation.data;
    const mb = bond.data;
    const disputeList = disputes.data ?? [];
    const isLoading = reputation.loading || bond.loading || disputes.loading;

    const score = mr?.reputationScore ?? 0;
    const circumference = 2 * Math.PI * 54;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    return (
        <div className="page-content">
            <div className="page-header">
                <div>
                    <h1>Disputes & Reputation</h1>
                    <p>On-chain trust scoring, active disputes, and bond management</p>
                </div>
                {isLoading && <span className="badge badge-warning">Loading…</span>}
            </div>

            {/* Score + Bond Row */}
            <div className="charts-row">
                {/* Reputation Ring */}
                <div className="chart-card" style={{ flex: 0.4, textAlign: 'center', padding: 'var(--space-6)' }}>
                    <svg width="130" height="130" viewBox="0 0 120 120" style={{ margin: '0 auto var(--space-4)' }}>
                        <circle cx="60" cy="60" r="54" fill="none" stroke="var(--border-secondary)" strokeWidth="8" />
                        <circle cx="60" cy="60" r="54" fill="none"
                            stroke={score >= 70 ? 'var(--success)' : score >= 40 ? 'var(--warning)' : 'var(--danger)'}
                            strokeWidth="8" strokeLinecap="round"
                            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                            transform="rotate(-90 60 60)" style={{ transition: 'stroke-dashoffset 1s ease' }} />
                        <text x="60" y="56" textAnchor="middle" fill="var(--text-primary)" fontSize="28" fontWeight="800" fontFamily="var(--font-mono)">{score}</text>
                        <text x="60" y="74" textAnchor="middle" fill="var(--text-tertiary)" fontSize="11" fontWeight="500">/ 100</text>
                    </svg>
                    <h3 style={{ marginBottom: 'var(--space-2)' }}>Reputation Score</h3>
                    {mr && (
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                            <div>Timeout disputes: {mr.timeoutDisputes}</div>
                            <div>Suspicion: {mr.suspicionScore}</div>
                            <div>Attestors used: {mr.uniqueAttestationServersUsed}</div>
                            <div>Business hours: {bpsToPercent(mr.pctRedemptionsInBusinessHours).toFixed(0)}%</div>
                        </div>
                    )}
                </div>

                {/* Bond Status */}
                <div className="chart-card" style={{ flex: 0.6 }}>
                    <h3><Lock size={16} style={{ verticalAlign: '-3px', marginRight: 8 }} />Bond Status</h3>
                    <div style={{ padding: 'var(--space-4)' }}>
                        {mb ? (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Bonded</span>
                                    <span className="text-mono" style={{ fontWeight: 700, color: 'var(--success-text)' }}>{lamportsToSol(mb.bondedLamports).toFixed(4)} SOL</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Required Minimum</span>
                                    <span className="text-mono" style={{ fontWeight: 700 }}>{lamportsToSol(mb.minRequiredLamports).toFixed(4)} SOL</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-3)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Status</span>
                                    <span className={`badge ${mb.isLocked ? 'badge-success' : 'badge-warning'}`}>
                                        {mb.isLocked ? <><Lock size={12} /> Locked</> : <><Unlock size={12} /> Unlock Requested</>}
                                    </span>
                                </div>
                                {!mb.isLocked && mb.unlockRequestedAt > 0 && (
                                    <div style={{ marginTop: 'var(--space-3)', fontSize: 12, color: 'var(--warning-text)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                        <Clock size={12} /> Unlock requested {new Date(mb.unlockRequestedAt * 1000).toLocaleDateString()}
                                    </div>
                                )}
                            </>
                        ) : (
                            <p style={{ color: 'var(--text-tertiary)', padding: 'var(--space-4)', textAlign: 'center', fontSize: 14 }}>
                                No bond account found. Deploy merchant to see bond status.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Dispute History */}
            <div className="chart-card">
                <h3><AlertTriangle size={16} style={{ verticalAlign: '-3px', marginRight: 8 }} />Dispute History ({disputeList.length})</h3>
                <div style={{ padding: 'var(--space-2)' }}>
                    {disputeList.length === 0 && !disputes.loading && (
                        <p style={{ color: 'var(--text-tertiary)', padding: 'var(--space-6)', textAlign: 'center', fontSize: 14 }}>
                            No disputes found. This is a good sign — clean record!
                        </p>
                    )}
                    {disputeList.map((d, i) => {
                        const key = d.referral.toBase58();
                        const isOpen = expanded === key;
                        const statusColors: Record<string, string> = {
                            Pending: 'badge-warning', Dismissed: 'badge-success',
                            UpheldByTimeout: 'badge-danger', UpheldByVote: 'badge-danger',
                        };
                        return (
                            <motion.div key={key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                style={{ borderBottom: '1px solid var(--border-secondary)', padding: 'var(--space-3) var(--space-4)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: 'var(--space-3)' }}
                                    onClick={() => setExpanded(isOpen ? null : key)}>
                                    <span className={`badge ${statusColors[d.status] || 'badge-accent'}`}>{d.status}</span>
                                    <span className="text-mono" style={{ fontSize: 13, flex: 1 }}>Referral: {shortenAddress(d.referral.toBase58())}</span>
                                    <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{new Date(d.raisedAt * 1000).toLocaleDateString()}</span>
                                    <span className="text-mono" style={{ fontSize: 13, fontWeight: 600 }}>{lamportsToSol(d.stakeLamports).toFixed(4)} SOL</span>
                                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </div>
                                <AnimatePresence>
                                    {isOpen && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                            style={{ overflow: 'hidden', paddingTop: 'var(--space-3)' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', fontSize: 13 }}>
                                                <div>
                                                    <span style={{ color: 'var(--text-tertiary)' }}>Watchdog</span>
                                                    <div className="text-mono">{shortenAddress(d.watchdog.toBase58(), 6)}</div>
                                                </div>
                                                <div>
                                                    <span style={{ color: 'var(--text-tertiary)' }}>Resolved</span>
                                                    <div>{d.resolvedAt ? new Date(d.resolvedAt * 1000).toLocaleDateString() : 'Pending'}</div>
                                                </div>
                                            </div>
                                            <a href={explorerUrl(d.referral.toBase58())} target="_blank" rel="noopener noreferrer"
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--accent-primary)', marginTop: 'var(--space-2)' }}>
                                                View on Explorer <ExternalLink size={11} />
                                            </a>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
