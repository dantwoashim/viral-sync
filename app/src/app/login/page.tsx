'use client';

import React, { useEffect, useRef } from 'react';
import { Zap, Store, Smartphone, CheckCircle, ArrowRight, LogIn } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const { authenticated, login, setRole, role, loading, googleEnabled, authError } = useAuth();
    const router = useRouter();
    const pendingRole = useRef<'merchant' | 'consumer' | null>(null);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';

    const getPendingRole = (): 'merchant' | 'consumer' | null => {
        if (pendingRole.current) {
            return pendingRole.current;
        }
        if (typeof window === 'undefined') {
            return null;
        }
        const stored = localStorage.getItem('vs-pending-role');
        return stored === 'merchant' || stored === 'consumer' ? stored : null;
    };

    // When auth completes + we have a pending role → set it and redirect
    useEffect(() => {
        const pending = getPendingRole();
        if (authenticated && pending) {
            const dest = pending === 'merchant' ? '/launchpad' : '/consumer';
            setRole(pending);
            pendingRole.current = null;
            localStorage.removeItem('vs-pending-role');
            router.push(dest);
        }
    }, [authenticated, setRole, router]);

    // Already authenticated + role → auto-redirect
    useEffect(() => {
        if (!authenticated || !role) {
            return;
        }
        if (getPendingRole()) {
            return;
        }
        if (!pendingRole.current) {
            router.replace(role === 'merchant' ? '/launchpad' : '/consumer');
        }
    }, [authenticated, role, router]);

    const handleMerchant = () => {
        pendingRole.current = 'merchant';
        localStorage.setItem('vs-pending-role', 'merchant');
        if (authenticated) {
            setRole('merchant');
            router.push('/launchpad');
        } else {
            login();
        }
    };

    const handleConsumer = () => {
        pendingRole.current = 'consumer';
        localStorage.setItem('vs-pending-role', 'consumer');
        if (authenticated) {
            setRole('consumer');
            router.push('/consumer');
        } else {
            login();
        }
    };

    if (loading) {
        return (
            <div className="login-screen">
                <div className="login-logo"><Zap size={30} color="white" /></div>
                <h1 className="login-title">Viral Sync</h1>
                <p className="login-subtitle">Loading...</p>
            </div>
        );
    }

    return (
        <div className="login-screen">
            <div className="login-logo"><Zap size={30} color="white" /></div>

            <h1 className="login-title">Viral Sync</h1>
            <p className="login-subtitle">
                Decentralized referral protocol on Solana. Choose your path to begin.
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 'var(--s4)' }}>
                {googleEnabled
                    ? 'Google sign-in is available and recommended.'
                    : 'Running in demo mode. Configure Firebase env vars to enable Google sign-in.'}
            </p>
            {authError && (
                <p style={{ fontSize: 12, color: 'var(--crimson)', marginBottom: 'var(--s4)' }}>
                    {authError}
                </p>
            )}
            {authError?.toLowerCase().includes('authorized') && origin && (
                <p style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 'var(--s4)' }}>
                    Add `{origin}` to Firebase Authentication {'>'} Authorized domains.
                </p>
            )}

            <div className="login-cards">
                {/* Merchant */}
                <button className="login-card scroll-card" onClick={handleMerchant} style={{ textAlign: 'left', width: '100%' }}>
                    <div className="login-card-icon" style={{ background: 'var(--crimson-soft)', color: 'var(--crimson)' }}>
                        <Store size={26} />
                    </div>
                    <h3 style={{ textAlign: 'center' }}>Merchant Workspace</h3>
                    <p style={{ textAlign: 'center' }}>Dashboard, Oracle analytics, POS terminal</p>
                    <ul className="login-card-features">
                        <li><CheckCircle size={13} color="var(--jade)" /> Real-time on-chain analytics</li>
                        <li><CheckCircle size={13} color="var(--jade)" /> NFC / QR redemption terminal</li>
                        <li><CheckCircle size={13} color="var(--jade)" /> Viral K-Factor computation</li>
                    </ul>
                    <div className="login-card-cta" style={{ color: 'var(--crimson)', justifyContent: 'center' }}>
                        <LogIn size={15} /> Enter as Merchant <ArrowRight size={15} />
                    </div>
                </button>

                {/* Consumer */}
                <button className="login-card scroll-card" onClick={handleConsumer} style={{ textAlign: 'left', width: '100%' }}>
                    <div className="login-card-icon" style={{ background: 'var(--jade-soft)', color: 'var(--jade)' }}>
                        <Smartphone size={26} />
                    </div>
                    <h3 style={{ textAlign: 'center' }}>Consumer Path</h3>
                    <p style={{ textAlign: 'center' }}>Share, earn, redeem — zero crypto knowledge needed</p>
                    <ul className="login-card-features">
                        <li><CheckCircle size={13} color="var(--jade)" /> Gasless transactions</li>
                        <li><CheckCircle size={13} color="var(--jade)" /> Demo wallet — no setup needed</li>
                        <li><CheckCircle size={13} color="var(--jade)" /> Embedded Solana wallet</li>
                    </ul>
                    <div className="login-card-cta" style={{ color: 'var(--jade)', justifyContent: 'center' }}>
                        <LogIn size={15} /> Enter as Consumer <ArrowRight size={15} />
                    </div>
                </button>
            </div>
        </div>
    );
}
