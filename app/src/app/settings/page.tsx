'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Shield, Bell, Palette, Globe, Key, HelpCircle, LogOut, Coins, User } from 'lucide-react';

const sections = [
    {
        title: 'Merchant',
        items: [
            { icon: Coins, label: 'Token Configuration', sub: '5% commission · 30d expiry', color: 'var(--accent)' },
            { icon: Shield, label: 'Security', sub: 'Session keys · Bond status', color: 'var(--success)' },
            { icon: Globe, label: 'Geo-Fencing', sub: 'Kathmandu Valley', color: 'var(--accent-2)' },
        ],
    },
    {
        title: 'App',
        items: [
            { icon: Palette, label: 'Appearance', sub: 'Dark mode', color: 'var(--purple)' },
            { icon: Bell, label: 'Notifications', sub: 'All enabled', color: 'var(--accent-3)' },
            { icon: Key, label: 'Connected Wallets', sub: 'Privy embedded', color: 'var(--accent)' },
        ],
    },
    {
        title: 'Support',
        items: [
            { icon: HelpCircle, label: 'Help & Docs', sub: 'Guides and FAQ', color: 'var(--text-secondary)' },
            { icon: LogOut, label: 'Sign Out', sub: '', color: 'var(--danger)' },
        ],
    },
];

const fade = (i: number) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4 } },
});

export default function SettingsPage() {
    return (
        <>
            <div className="page-top">
                <h1>Settings</h1>
            </div>

            <div className="page-scroll">
                {/* Profile */}
                <motion.div {...fade(0)} className="glass" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-5)', marginBottom: 'var(--space-5)' }}>
                    <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, var(--accent), var(--accent-3))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <User size={24} color="white" />
                    </div>
                    <div>
                        <div style={{ fontSize: 17, fontWeight: 700 }}>Prabin's Café</div>
                        <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Premium Plan · Devnet</div>
                    </div>
                    <ChevronRight size={18} color="var(--text-tertiary)" style={{ marginLeft: 'auto' }} />
                </motion.div>

                {sections.map((section, si) => (
                    <motion.div key={section.title} {...fade(si + 1)} className="section">
                        <div className="section-header">
                            <span className="section-title">{section.title}</span>
                        </div>
                        <div className="list-card">
                            {section.items.map((item) => (
                                <div key={item.label} className="list-item" style={{ cursor: 'pointer' }}>
                                    <div className="list-item-icon" style={{ background: item.color + '18', color: item.color }}>
                                        <item.icon size={18} />
                                    </div>
                                    <div className="list-item-content">
                                        <div className="list-item-title">{item.label}</div>
                                        {item.sub && <div className="list-item-sub">{item.sub}</div>}
                                    </div>
                                    <ChevronRight size={16} color="var(--text-hint)" />
                                </div>
                            ))}
                        </div>
                    </motion.div>
                ))}

                <div style={{ height: 'var(--space-8)' }} />
            </div>
        </>
    );
}
