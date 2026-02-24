'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/lib/auth';

export default function MerchantShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { role } = useAuth();
    const hideNav = pathname === '/login' || pathname.startsWith('/pos');
    const showNavigation = !hideNav && role !== null;
    const showSidebar = showNavigation && role === 'merchant';

    return (
        <div className={`shell-layout ${showSidebar ? 'with-sidebar' : ''}`}>
            {showSidebar && (
                <div className="shell-sidebar">
                    <Sidebar />
                </div>
            )}
            <main className={showNavigation ? 'shell-main mobile-shell' : 'shell-main'}>
                {children}
            </main>
            {showNavigation && <BottomNav />}
        </div>
    );
}
