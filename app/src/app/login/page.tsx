'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Store, Smartphone, CheckCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

const fade = (i: number) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } },
});

export default function LoginPage() {
    const { login } = useAuth();
    const router = useRouter();

    const handleMerchant = () => { login(); router.push('/'); };
    const handleConsumer = () => { login(); router.push('/consumer'); };

    return (
        <div className="login-screen">
            <motion.div {...fade(0)} className="login-logo">
                <Zap size={32} />
            </motion.div>

            <motion.h1 {...fade(1)} className="login-title">Viral Sync</motion.h1>
            <motion.p {...fade(2)} className="login-subtitle">
                Decentralized referral protocol on Solana. Turn word-of-mouth into measurable, on-chain growth.
            </motion.p>

            <div className="login-cards">
                <motion.div {...fade(3)} className="login-card glass" onClick={handleMerchant}>
                    <div className="login-card-icon" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                        <Store size={28} />
                    </div>
                    <h3>Merchant Dashboard</h3>
                    <p>Analytics, oracle insights, POS terminal, and token management</p>
                    <ul className="login-card-features">
                        <li><CheckCircle size={14} color="var(--success)" /> Real-time on-chain analytics</li>
                        <li><CheckCircle size={14} color="var(--success)" /> NFC / QR redemption terminal</li>
                        <li><CheckCircle size={14} color="var(--success)" /> Viral Oracle with K-Factor</li>
                    </ul>
                    <div className="login-card-cta">
                        Enter as Merchant <ArrowRight size={16} />
                    </div>
                </motion.div>

                <motion.div {...fade(4)} className="login-card glass" onClick={handleConsumer}>
                    <div className="login-card-icon" style={{ background: 'var(--accent-2-soft)', color: 'var(--accent-2)' }}>
                        <Smartphone size={28} />
                    </div>
                    <h3>Consumer Wallet</h3>
                    <p>Share, earn, redeem — no wallet or crypto knowledge needed</p>
                    <ul className="login-card-features">
                        <li><CheckCircle size={14} color="var(--success)" /> Gasless transactions</li>
                        <li><CheckCircle size={14} color="var(--success)" /> Social login via Google / Apple</li>
                        <li><CheckCircle size={14} color="var(--success)" /> Embedded Solana wallet</li>
                    </ul>
                    <div className="login-card-cta" style={{ color: 'var(--accent-2)' }}>
                        Enter as Consumer <ArrowRight size={16} />
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
