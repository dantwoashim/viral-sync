'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Settings, Coins, Clock, Shield, Percent, AlertTriangle, ExternalLink } from 'lucide-react';
import { useMerchantConfig, useMerchantBond } from '@/lib/hooks';
import { bpsToPercent, formatTokenAmount, lamportsToSol, explorerUrl, shortenAddress } from '@/lib/solana';
import { useWallet } from '@/lib/useWallet';

const fadeUp = {
    hidden: { opacity: 0, y: 12 },
    visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.3 } }),
};

export default function SettingsPage() {
    const wallet = useWallet();
    const config = useMerchantConfig(wallet);
    const bond = useMerchantBond(wallet);
    const mc = config.data;
    const mb = bond.data;
    const isLoading = config.loading;

    const sections = mc ? [
        {
            title: 'Token Configuration',
            icon: Coins,
            fields: [
                { label: 'Mint Address', value: shortenAddress(mc.mint.toBase58(), 8), mono: true, link: explorerUrl(mc.mint.toBase58()) },
                { label: 'Commission Rate', value: `${bpsToPercent(mc.commissionRateBps).toFixed(2)}%` },
                { label: 'Transfer Fee', value: `${bpsToPercent(mc.transferFeeBps).toFixed(2)}%` },
                { label: 'Token Expiry', value: `${mc.tokenExpiryDays} days` },
                { label: 'Tokens Issued', value: formatTokenAmount(mc.tokensIssued), mono: true },
                { label: 'Current Supply', value: formatTokenAmount(mc.currentSupply), mono: true },
            ],
        },
        {
            title: 'Referral Rules',
            icon: Shield,
            fields: [
                { label: 'Min Hold Before Share', value: `${mc.minHoldBeforeShareSecs}s (${(mc.minHoldBeforeShareSecs / 3600).toFixed(1)}h)` },
                { label: 'Min Tokens Per Referral', value: formatTokenAmount(mc.minTokensPerReferral), mono: true },
                { label: 'Max Tokens Per Referral', value: formatTokenAmount(mc.maxTokensPerReferral), mono: true },
                { label: 'Max Referrals/Wallet/Day', value: `${mc.maxReferralsPerWalletPerDay}` },
                { label: 'Allow Gen-2 Transfers', value: mc.allowSecondGenTransfer ? 'Yes' : 'No' },
                { label: 'Slots Per Day', value: mc.slotsPerDay.toLocaleString() },
            ],
        },
        {
            title: 'Protocol Status',
            icon: Settings,
            fields: [
                { label: 'Merchant Active', value: mc.isActive ? '✅ Active' : '❌ Inactive' },
                { label: 'First Issuance Done', value: mc.firstIssuanceDone ? 'Yes' : 'Not yet' },
                { label: 'Merchant Address', value: shortenAddress(mc.merchant.toBase58(), 8), mono: true, link: explorerUrl(mc.merchant.toBase58()) },
                ...(mb ? [
                    { label: 'Bond Locked', value: mb.isLocked ? '🔒 Locked' : '🔓 Unlocking' },
                    { label: 'Bonded Amount', value: `${lamportsToSol(mb.bondedLamports).toFixed(4)} SOL`, mono: true },
                ] : []),
            ],
        },
    ] : [];

    return (
        <div className="page-content">
            <div className="page-header">
                <div>
                    <h1>Settings</h1>
                    <p>On-chain protocol configuration (read from MerchantConfig PDA)</p>
                </div>
                {isLoading && <span className="badge badge-warning">Loading…</span>}
            </div>

            {sections.length === 0 && !isLoading && (
                <div className="chart-card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                    <AlertTriangle size={32} style={{ color: 'var(--warning-text)', marginBottom: 'var(--space-3)' }} />
                    <h3>No Merchant Configured</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14, maxWidth: 400, margin: 'var(--space-2) auto' }}>
                        Set <code>NEXT_PUBLIC_MERCHANT_PUBKEY</code> in <code>.env.local</code> to connect to a deployed merchant,
                        or deploy the program to devnet using <code>./deploy.sh devnet</code>.
                    </p>
                </div>
            )}

            {sections.map((section, si) => (
                <motion.div key={section.title} className="chart-card" custom={si} initial="hidden" animate="visible" variants={fadeUp}
                    style={{ marginBottom: 'var(--space-4)' }}>
                    <h3>
                        <section.icon size={16} style={{ verticalAlign: '-3px', marginRight: 8 }} />
                        {section.title}
                    </h3>
                    <div style={{ padding: 'var(--space-2) var(--space-4)' }}>
                        {section.fields.map((f) => (
                            <div key={f.label} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: 'var(--space-3) 0', borderBottom: '1px solid var(--border-secondary)',
                            }}>
                                <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{f.label}</span>
                                <span className={f.mono ? 'text-mono' : ''} style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                    {f.value}
                                    {f.link && (
                                        <a href={f.link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)' }}>
                                            <ExternalLink size={12} />
                                        </a>
                                    )}
                                </span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            ))}

            {/* Danger Zone */}
            {mc && mc.closeInitiatedAt > 0 && (
                <motion.div className="chart-card" custom={sections.length} initial="hidden" animate="visible" variants={fadeUp}
                    style={{ borderColor: 'var(--danger)' }}>
                    <h3 style={{ color: 'var(--danger-text)' }}>
                        <AlertTriangle size={16} style={{ verticalAlign: '-3px', marginRight: 8 }} /> Close Window Active
                    </h3>
                    <p style={{ padding: 'var(--space-4)', fontSize: 14, color: 'var(--text-secondary)' }}>
                        Close initiated: {new Date(mc.closeInitiatedAt * 1000).toLocaleString()}<br />
                        Window ends: {new Date(mc.closeWindowEndsAt * 1000).toLocaleString()}
                    </p>
                </motion.div>
            )}
        </div>
    );
}
