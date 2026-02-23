'use client';

import React, { useEffect, useRef } from 'react';
import { Zap, Store, Smartphone, CheckCircle, ArrowRight, LogIn } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const { authenticated, login, setRole, role, loading } = useAuth();
    const router = useRouter();
    const pendingRole = useRef<'merchant' | 'consumer' | null>(null);

    // When auth completes + we have a pending role → set it and redirect
    useEffect(() => {
        if (authenticated && pendingRole.current) {
            const dest = pendingRole.current === 'merchant' ? '/' : '/consumer';
            setRole(pendingRole.current);
            pendingRole.current = null;
            router.push(dest);
        }
    }, [authenticated, setRole, router]);

    // If already authenticated + already has a role → redirect
    useEffect(() => {
        if (authenticated && role && !pendingRole.current) {
            router.replace(role === 'merchant' ? '/' : '/consumer');
        }
    }, [authenticated, role, router]);

    const handleMerchant = () => {
        pendingRole.current = 'merchant';
        if (authenticated) {
            // Already logged in — just set role and go
            setRole('merchant');
            router.push('/');
        } else {
            // Open the login modal (Privy or demo). The useEffect above
            // will fire once auth completes and redirect automatically.
            login();
        }
    };

    const handleConsumer = () => {
        pendingRole.current = 'consumer';
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
                <h1 className="login-title">道 Viral Sync</h1>
                <p className="login-subtitle">Loading...</p>
            </div>
        );
    }

    return (
        <div className="login-screen">
            <div className="login-logo"><Zap size={30} color="white" /></div>

            <h1 className="login-title">道 Viral Sync</h1>
            <p className="login-subtitle">
                Decentralized referral protocol on Solana. Choose your path to begin.
            </p>

            <div className="login-cards">
                {/* Merchant */}
                <button className="login-card scroll-card" onClick={handleMerchant} style={{ textAlign: 'left', width: '100%' }}>
                    <div className="login-card-icon" style={{ background: 'var(--crimson-soft)', color: 'var(--crimson)' }}>
                        <Store size={26} />
                    </div>
                    <h3 style={{ textAlign: 'center' }}>Merchant Realm</h3>
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
                        <li><CheckCircle size={13} color="var(--jade)" /> Sign in with Google / Apple</li>
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
