'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import BottomNav from '@/components/BottomNav';

export default function MerchantShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const hideNav = pathname === '/login';

    return (
        <div className={hideNav ? '' : 'mobile-shell'}>
            {children}
            {!hideNav && <BottomNav />}
        </div>
    );
}
