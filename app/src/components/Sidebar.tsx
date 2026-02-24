'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/app/providers';
import { useAuth } from '@/lib/auth';
import { useWallet } from '@/lib/useWallet';
import { shortenAddress } from '@/lib/solana';
import {
    BarChart3,
    Rocket,
    TrendingUp,
    Network,
    ShieldAlert,
    Settings,
    Zap,
} from 'lucide-react';

const merchantNav = [
    { href: '/launchpad', label: 'Launchpad', icon: Rocket },
    { href: '/', label: 'Overview', icon: BarChart3 },
    { href: '/oracle', label: 'Viral Oracle', icon: TrendingUp },
    { href: '/network', label: 'Network Graph', icon: Network },
    { href: '/disputes', label: 'Disputes', icon: ShieldAlert },
    { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { theme, toggleTheme } = useTheme();
    const { displayName } = useAuth();
    const wallet = useWallet();
    const title = displayName || 'Merchant';
    const initials = title.trim().charAt(0).toUpperCase() || 'M';

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <div className="sidebar-logo-icon">
                    <Zap size={20} />
                </div>
                <span className="sidebar-logo-text">Viral Sync</span>
            </div>

            <div className="sidebar-label">Merchant Dashboard</div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {merchantNav.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`sidebar-item ${pathname === item.href ? 'active' : ''}`}
                    >
                        <item.icon size={20} />
                        <span>{item.label}</span>
                    </Link>
                ))}
            </nav>

            <div className="sidebar-bottom">
                <div className="theme-row">
                    <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>
                        {theme === 'light' ? 'Light Mode' : 'Dark Mode'}
                    </span>
                    <button
                        onClick={toggleTheme}
                        className={`theme-toggle ${theme === 'dark' ? 'active' : ''}`}
                        aria-label="Toggle theme"
                    >
                        <div className="theme-toggle-knob" />
                    </button>
                </div>

                <div className="sidebar-user">
                    <div className="sidebar-avatar">{initials}</div>
                    <div>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{title}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                            {wallet ? shortenAddress(wallet.toBase58()) : 'No wallet'}
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
}
