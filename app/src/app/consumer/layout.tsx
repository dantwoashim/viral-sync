'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Zap, ScanLine, User } from 'lucide-react';

const tabs = [
    { href: '/consumer', icon: Home, label: 'Home' },
    { href: '/consumer/earn', icon: Zap, label: 'Earn' },
    { href: '/consumer/scan', icon: ScanLine, label: 'Scan' },
    { href: '/consumer/profile', icon: User, label: 'You' },
];

export default function ConsumerLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="consumer-shell">
            {/* Status Bar Spacer */}
            <div className="consumer-safe-top" />

            {/* Main Scrollable Content */}
            <main className="consumer-content">
                {children}
            </main>

            {/* Bottom Tab Bar */}
            <nav className="consumer-tab-bar">
                {tabs.map((tab) => {
                    const isActive = tab.href === '/consumer'
                        ? pathname === '/consumer'
                        : pathname.startsWith(tab.href);
                    return (
                        <Link key={tab.href} href={tab.href} className={`consumer-tab ${isActive ? 'active' : ''}`}>
                            <tab.icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
                            <span>{tab.label}</span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
