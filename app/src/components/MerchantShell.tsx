'use client';

import React, { useEffect } from 'react';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/lib/auth';
import { useClientPathname } from '@/lib/useClientPathname';

export default function MerchantShell({ children }: { children: React.ReactNode }) {
    const pathname = useClientPathname();
    const { role, setRole } = useAuth();
    const hideNav = !pathname || pathname === '/login' || pathname.startsWith('/pos');
    const inferredRole = hideNav ? null : (pathname.startsWith('/consumer') ? 'consumer' : 'merchant');
    const activeRole = role ?? inferredRole;
    const showNavigation = !hideNav && activeRole !== null;
    const showSidebar = showNavigation && activeRole === 'merchant';

    useEffect(() => {
        if (!role && inferredRole) {
            setRole(inferredRole);
        }
    }, [role, inferredRole, setRole]);

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
