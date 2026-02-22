'use client';

import React from 'react';
import Sidebar from '@/components/Sidebar';
import { usePathname } from 'next/navigation';

export default function MerchantShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // If we're on a consumer, POS, or login route, don't render the merchant shell
    if (pathname.startsWith('/consumer') || pathname.startsWith('/pos') || pathname.startsWith('/login')) {
        return <>{children}</>;
    }

    return (
        <>
            <Sidebar />
            <main className="main-content">
                {children}
            </main>
        </>
    );
}
