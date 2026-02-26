'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/lib/auth';
import { useClientPathname } from '@/lib/useClientPathname';

export default function MerchantShell({ children }: { children: React.ReactNode }) {
    const pathname = useClientPathname();
    const router = useRouter();
    const { authenticated, loading, role, setRole } = useAuth();
    const hideNav = !pathname || pathname === '/login' || pathname.startsWith('/pos');
    const inferredRole = hideNav || !authenticated ? null : (pathname.startsWith('/consumer') ? 'consumer' : 'merchant');
    const activeRole = role ?? inferredRole;
    const showNavigation = authenticated && !hideNav && activeRole !== null;
    const showSidebar = showNavigation && activeRole === 'merchant';

    useEffect(() => {
        if (authenticated && !role && inferredRole) {
            setRole(inferredRole);
        }
    }, [authenticated, role, inferredRole, setRole]);

    useEffect(() => {
        if (loading || !pathname) {
            return;
        }
        if (!authenticated && pathname !== '/login') {
            router.replace('/login');
        }
    }, [authenticated, loading, pathname, router]);

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
