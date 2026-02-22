'use client';

import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { Store, ArrowRight, Zap, Shield, Gift } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const { login, authenticated, setRole, role, loading } = useAuth();
    const router = useRouter();
    const pendingRoleRef = useRef<string | null>(null);

    // Redirect when authenticated — check both role state and localStorage
    React.useEffect(() => {
        if (loading) return;
        if (!authenticated) return;

        const activeRole = role || pendingRoleRef.current || localStorage.getItem('vs-user-role');

        if (activeRole === 'merchant') {
            router.replace('/');
        } else if (activeRole === 'consumer') {
            router.replace('/consumer');
        } else {
            // Authenticated but no role — default to merchant dashboard
            router.replace('/');
        }
    }, [authenticated, role, loading, router]);

    const handleRoleSelect = (selectedRole: 'consumer' | 'merchant') => {
        pendingRoleRef.current = selectedRole;
        setRole(selectedRole);
        login();
    };

    // If loading or already authenticated and redirecting, show nothing
    if (loading || authenticated) {
        return (
            <div className="login-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>
                    <div style={{ fontSize: 32, marginBottom: 'var(--space-3)' }}>VS</div>
                    <p>{loading ? 'Loading...' : 'Redirecting...'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="login-page">
            <motion.div className="login-hero" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <div className="login-logo">VS</div>
                <h1>Welcome to Viral Sync</h1>
                <p>
                    Turn word-of-mouth into a measurable, rewarding experience.<br />
                    No crypto knowledge needed — just sign in and start.
                </p>
            </motion.div>

            <div className="login-cards">
                <motion.div
                    className="login-role-card"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    onClick={() => handleRoleSelect('consumer')}
                >
                    <div className="login-role-icon" style={{ background: 'var(--accent-primary-subtle)', color: 'var(--accent-primary)' }}>
                        <Gift size={24} />
                    </div>
                    <h3>I'm a Customer</h3>
                    <p>Earn rewards by sharing things you love with friends</p>
                    <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                        {['Share referral links', 'Earn commissions', 'Redeem in-store'].map((item) => (
                            <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 12, color: 'var(--text-secondary)' }}>
                                <Zap size={10} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} /> {item}
                            </div>
                        ))}
                    </div>
                    <div style={{ marginTop: 'var(--space-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)', fontSize: 14, fontWeight: 600, color: 'var(--accent-primary)' }}>
                        Get Started <ArrowRight size={14} />
                    </div>
                </motion.div>

                <motion.div
                    className="login-role-card"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    onClick={() => handleRoleSelect('merchant')}
                >
                    <div className="login-role-icon" style={{ background: 'rgba(139, 92, 246, 0.08)', color: '#8B5CF6' }}>
                        <Store size={24} />
                    </div>
                    <h3>I'm a Merchant</h3>
                    <p>Launch a referral program that runs itself</p>
                    <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                        {['Track viral growth', 'Manage commissions', 'POS terminal'].map((item) => (
                            <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 12, color: 'var(--text-secondary)' }}>
                                <Shield size={10} style={{ color: '#8B5CF6', flexShrink: 0 }} /> {item}
                            </div>
                        ))}
                    </div>
                    <div style={{ marginTop: 'var(--space-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)', fontSize: 14, fontWeight: 600, color: '#8B5CF6' }}>
                        Launch Program <ArrowRight size={14} />
                    </div>
                </motion.div>
            </div>

            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                style={{ marginTop: 'var(--space-6)', fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center', maxWidth: 400, lineHeight: 1.6 }}
            >
                Sign in with Google, Apple, or email — your secure account is created automatically.
                No wallet, crypto, or technical knowledge required.
            </motion.p>
        </div>
    );
}
