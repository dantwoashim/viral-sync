'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, TrendingUp, Scan, CreditCard, Settings } from 'lucide-react';

const tabs = [
    { href: '/', label: 'Home', icon: BarChart3 },
    { href: '/oracle', label: 'Oracle', icon: TrendingUp },
    { href: '/pos', label: 'POS', icon: Scan },
    { href: '/consumer', label: 'Wallet', icon: CreditCard },
    { href: '/settings', label: 'More', icon: Settings },
];

export default function BottomNav() {
    const pathname = usePathname();

    const isActive = (href: string) => {
        if (href === '/') return pathname === '/';
        return pathname.startsWith(href);
    };

    return (
        <nav className="bottom-nav">
            {tabs.map((tab) => (
                <Link key={tab.href} href={tab.href} className={`nav-item ${isActive(tab.href) ? 'active' : ''}`}>
                    <tab.icon size={22} strokeWidth={isActive(tab.href) ? 2.2 : 1.6} />
                    <span>{tab.label}</span>
                </Link>
            ))}
        </nav>
    );
}
