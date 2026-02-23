'use client';

import React from 'react';
import BottomNav from '@/components/BottomNav';

export default function MerchantShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="mobile-shell">
            {children}
            <BottomNav />
        </div>
    );
}
