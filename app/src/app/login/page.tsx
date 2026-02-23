'use client';

import React, { useEffect } from 'react';
import { Zap, Store, Smartphone, CheckCircle, ArrowRight, LogIn } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const { authenticated, login, setRole, role, loading } = useAuth();
    const router = useRouter();

    // Auto-redirect if already authenticated + role selected
    useEffect(() => {
        if (authenticated && role) {
            router.replace(role === 'merchant' ? '/' : '/consumer');
        }
    }, [authenticated, role, router]);

    const handleMerchant = () => {
        if (!authenticated) {
            login(); // triggers Privy modal or demo modal
            // After login, the user returns here → they click Merchant again → role is set
        }
        setRole('merchant');
        router.push('/');
    };

    const handleConsumer = () => {
        if (!authenticated) {
            login();
        }
        setRole('consumer');
        router.push('/consumer');
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
