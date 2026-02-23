/**
 * Viral Sync — Auth Provider
 * 
 * Uses DemoAuth always. Privy integration is handled separately
 * via providers.tsx when running in a browser (not in APK).
 * 
 * The DemoLoginModal provides Google/Apple/Email sign-in flow
 * with the Xianxia aesthetic. Each login creates a deterministic
 * demo wallet address.
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { PublicKey } from '@solana/web3.js';

/* ── Types ── */

export type UserRole = 'consumer' | 'merchant' | null;

export interface AuthState {
    loading: boolean;
    authenticated: boolean;
    walletAddress: PublicKey | null;
    displayName: string;
    avatarUrl: string | null;
    loginMethod: 'google' | 'apple' | 'email' | 'demo' | null;
    role: UserRole;
    login: () => void;
    logout: () => void;
    setRole: (role: UserRole) => void;
    hasSessionKey: boolean;
}

const defaultAuth: AuthState = {
    loading: true,
    authenticated: false,
    walletAddress: null,
    displayName: '',
    avatarUrl: null,
    loginMethod: null,
    role: null,
    login: () => { },
    logout: () => { },
    setRole: () => { },
    hasSessionKey: false,
};

const AuthContext = createContext<AuthState>(defaultAuth);
export const useAuth = () => useContext(AuthContext);

/* ═══════════════════════════════════════════════════
   AUTH PROVIDER
   ═══════════════════════════════════════════════════ */

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [loading, setLoading] = useState(true);
    const [authenticated, setAuthenticated] = useState(false);
    const [walletAddress, setWalletAddress] = useState<PublicKey | null>(null);
    const [displayName, setDisplayName] = useState('');
    const [loginMethod, setLoginMethod] = useState<AuthState['loginMethod']>(null);
    const [role, setRole] = useState<UserRole>(null);
    const [showModal, setShowModal] = useState(false);

    // Restore session from localStorage on mount
    useEffect(() => {
        try {
            const savedSession = localStorage.getItem('vs-auth-session');
            if (savedSession) {
                const s = JSON.parse(savedSession);
                if (s.walletAddress) {
                    setWalletAddress(new PublicKey(s.walletAddress));
                    setDisplayName(s.displayName || '');
                    setLoginMethod(s.loginMethod || 'demo');
                    setRole(s.role || null);
                    setAuthenticated(true);
                }
            }
        } catch {
            localStorage.removeItem('vs-auth-session');
        }
        setLoading(false);
    }, []);

    const login = useCallback(() => setShowModal(true), []);

    const logout = useCallback(() => {
        setAuthenticated(false);
        setWalletAddress(null);
        setDisplayName('');
        setLoginMethod(null);
        setRole(null);
        localStorage.removeItem('vs-auth-session');
        localStorage.removeItem('vs-user-role');
    }, []);

    const handleSetRole = useCallback((newRole: UserRole) => {
        setRole(newRole);
        // Also update the saved session
        const saved = localStorage.getItem('vs-auth-session');
        if (saved) {
            try {
                const s = JSON.parse(saved);
                s.role = newRole;
                localStorage.setItem('vs-auth-session', JSON.stringify(s));
            } catch { }
        }
        if (newRole) localStorage.setItem('vs-user-role', newRole);
        else localStorage.removeItem('vs-user-role');
    }, []);

    const handleLogin = useCallback((method: string, name: string) => {
        // Generate a deterministic wallet address from the name
        const seed = new Uint8Array(32);
        const nameBytes = new TextEncoder().encode(name + method + 'viral-sync');
        for (let i = 0; i < Math.min(nameBytes.length, 32); i++) {
            seed[i] = nameBytes[i];
        }
        let pubkey: PublicKey;
        try { pubkey = new PublicKey(seed); } catch { pubkey = PublicKey.default; }

        setWalletAddress(pubkey);
        setDisplayName(name);
        setLoginMethod(method as AuthState['loginMethod']);
        setAuthenticated(true);
        setShowModal(false);
        localStorage.setItem('vs-auth-session', JSON.stringify({
            walletAddress: pubkey.toBase58(),
            displayName: name,
            loginMethod: method,
            role,
        }));
    }, [role]);

    const value = useMemo<AuthState>(() => ({
        loading,
        authenticated,
        walletAddress,
        displayName,
        avatarUrl: null,
        loginMethod,
        role,
        login,
        logout,
        setRole: handleSetRole,
        hasSessionKey: false,
    }), [loading, authenticated, walletAddress, displayName, loginMethod, role, login, logout, handleSetRole]);

    return (
        <AuthContext.Provider value={value}>
            {children}
            {showModal && (
                <LoginModal onClose={() => setShowModal(false)} onLogin={handleLogin} />
            )}
        </AuthContext.Provider>
    );
}

/* ═══════════════════════════════════════════════════
   LOGIN MODAL — Xianxia styled
   ═══════════════════════════════════════════════════ */

function LoginModal({ onClose, onLogin }: {
    onClose: () => void;
    onLogin: (method: string, name: string) => void;
}) {
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [step, setStep] = useState<'choose' | 'email' | 'google' | 'apple'>('choose');

    const handleGoogleSubmit = () => {
        if (name.trim()) onLogin('google', name.trim());
    };

    const handleAppleSubmit = () => {
        if (name.trim()) onLogin('apple', name.trim());
    };

    const handleEmailSubmit = () => {
        if (email.includes('@')) onLogin('email', email.split('@')[0]);
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
        }} onClick={onClose}>
            <div style={{
                background: 'var(--scroll, rgba(18,15,25,0.95))',
                border: '1px solid var(--border, rgba(212,168,67,0.08))',
                borderRadius: 20, padding: 28, maxWidth: 360, width: '100%',
                boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            }} onClick={(e) => e.stopPropagation()}>

                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{
                        width: 52, height: 52, borderRadius: 14,
                        background: 'linear-gradient(135deg, #C41E3A, #D4A843)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 12px', fontSize: 18, fontWeight: 900, color: 'white',
                    }}>道</div>
                    <h2 style={{ fontSize: 18, fontWeight: 700 }}>Welcome to Viral Sync</h2>
                    <p style={{ fontSize: 13, opacity: 0.5, marginTop: 4 }}>Sign in to start earning rewards</p>
                </div>

                {/* Choose Provider */}
                {step === 'choose' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <button onClick={() => setStep('google')} style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '14px 16px', borderRadius: 12,
                            background: 'white', color: '#333', fontWeight: 600, fontSize: 14,
                            width: '100%',
                        }}>
                            <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" /><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" /><path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" /><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" /></svg>
                            Continue with Google
                        </button>
                        <button onClick={() => setStep('apple')} style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '14px 16px', borderRadius: 12,
                            background: '#000', color: '#fff', fontWeight: 600, fontSize: 14,
                            width: '100%',
                        }}>
                            <span style={{ fontSize: 18 }}>🍎</span> Continue with Apple
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: 0.3, margin: '4px 0' }}>
                            <div style={{ flex: 1, height: 1, background: 'currentColor' }} />
                            <span style={{ fontSize: 12 }}>or</span>
                            <div style={{ flex: 1, height: 1, background: 'currentColor' }} />
                        </div>
                        <button onClick={() => setStep('email')} style={{
                            padding: '14px 16px', borderRadius: 12,
                            background: 'rgba(255,255,255,0.06)', fontWeight: 600, fontSize: 14,
                            width: '100%',
                        }}>✉️ Continue with Email</button>
                    </div>
                )}

                {/* Google → Name Entry */}
                {step === 'google' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <p style={{ fontSize: 13, opacity: 0.6 }}>Enter your name to continue with Google:</p>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                            placeholder="Your name" autoFocus
                            style={{
                                padding: '12px 14px', borderRadius: 8,
                                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(212,168,67,0.08)',
                                color: '#E8E4D9', fontSize: 14, outline: 'none', width: '100%',
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'rgba(212,168,67,0.25)'}
                            onBlur={(e) => e.target.style.borderColor = 'rgba(212,168,67,0.08)'}
                            onKeyDown={(e) => e.key === 'Enter' && handleGoogleSubmit()}
                        />
                        <button onClick={handleGoogleSubmit} disabled={!name.trim()} style={{
                            padding: '14px 16px', borderRadius: 12, width: '100%',
                            background: name.trim() ? 'linear-gradient(135deg, #D4A843, #E07A5F)' : 'rgba(255,255,255,0.06)',
                            color: name.trim() ? '#0B0A12' : 'rgba(255,255,255,0.3)',
                            fontWeight: 700, fontSize: 14,
                        }}>Sign In with Google</button>
                        <button onClick={() => { setStep('choose'); setName(''); }} style={{ padding: 8, fontSize: 13, opacity: 0.4 }}>← Back</button>
                    </div>
                )}

                {/* Apple → Name Entry */}
                {step === 'apple' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <p style={{ fontSize: 13, opacity: 0.6 }}>Enter your name to continue with Apple:</p>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                            placeholder="Your name" autoFocus
                            style={{
                                padding: '12px 14px', borderRadius: 8,
                                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(212,168,67,0.08)',
                                color: '#E8E4D9', fontSize: 14, outline: 'none', width: '100%',
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'rgba(212,168,67,0.25)'}
                            onBlur={(e) => e.target.style.borderColor = 'rgba(212,168,67,0.08)'}
                            onKeyDown={(e) => e.key === 'Enter' && handleAppleSubmit()}
                        />
                        <button onClick={handleAppleSubmit} disabled={!name.trim()} style={{
                            padding: '14px 16px', borderRadius: 12, width: '100%',
                            background: name.trim() ? '#000' : 'rgba(255,255,255,0.06)',
                            color: name.trim() ? '#fff' : 'rgba(255,255,255,0.3)',
                            fontWeight: 700, fontSize: 14, border: name.trim() ? '1px solid #333' : 'none',
                        }}>Sign In with Apple</button>
                        <button onClick={() => { setStep('choose'); setName(''); }} style={{ padding: 8, fontSize: 13, opacity: 0.4 }}>← Back</button>
                    </div>
                )}

                {/* Email */}
                {step === 'email' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com" autoFocus
                            style={{
                                padding: '12px 14px', borderRadius: 8,
                                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(212,168,67,0.08)',
                                color: '#E8E4D9', fontSize: 14, outline: 'none', width: '100%',
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'rgba(212,168,67,0.25)'}
                            onBlur={(e) => e.target.style.borderColor = 'rgba(212,168,67,0.08)'}
                            onKeyDown={(e) => e.key === 'Enter' && handleEmailSubmit()}
                        />
                        <button onClick={handleEmailSubmit} disabled={!email.includes('@')} style={{
                            padding: '14px 16px', borderRadius: 12, width: '100%',
                            background: email.includes('@') ? 'linear-gradient(135deg, #D4A843, #E07A5F)' : 'rgba(255,255,255,0.06)',
                            color: email.includes('@') ? '#0B0A12' : 'rgba(255,255,255,0.3)',
                            fontWeight: 700, fontSize: 14,
                        }}>Continue with Email</button>
                        <button onClick={() => { setStep('choose'); setEmail(''); }} style={{ padding: 8, fontSize: 13, opacity: 0.4 }}>← Back</button>
                    </div>
                )}
            </div>
        </div>
    );
}
