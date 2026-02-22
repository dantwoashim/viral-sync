/**
 * Viral Sync — Auth Provider (Privy-powered)
 * 
 * When NEXT_PUBLIC_PRIVY_APP_ID is set:
 *   → Uses Privy for social login + MPC embedded Solana wallet
 *   → Users sign in with Google/Apple/Email → wallet created silently
 * 
 * When not set (dev mode):
 *   → Falls back to demo auth with built-in login modal
 *   → App still works for local development
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { PublicKey } from '@solana/web3.js';
import { PrivyProvider, usePrivy } from '@privy-io/react-auth';

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

/* ── Config ── */

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || '';
const HAS_PRIVY = PRIVY_APP_ID.length > 0;

/* ═══════════════════════════════════════════════════
   PRIVY-POWERED AUTH (when App ID is configured)
   ═══════════════════════════════════════════════════ */

function PrivyAuthInner({ children }: { children: React.ReactNode }) {
    const privy = usePrivy();
    const [role, setRole] = useState<UserRole>(null);

    // Use a ref so our stable callbacks always call the latest privy methods
    const privyRef = useRef(privy);
    privyRef.current = privy;

    // Restore role once
    useEffect(() => {
        const saved = localStorage.getItem('vs-user-role');
        if (saved === 'consumer' || saved === 'merchant') setRole(saved);
    }, []);

    // Memoize on user ID — not the user object — to avoid re-render from new object refs
    const userId = privy.user?.id ?? null;

    const walletAddress = useMemo(() => {
        const u = privyRef.current.user;
        if (!u) return null;
        const solWallet = u.linkedAccounts?.find(
            (a: any) => a.type === 'wallet' && a.chainType === 'solana'
        );
        if (solWallet && 'address' in solWallet) {
            try { return new PublicKey(solWallet.address as string); } catch { return null; }
        }
        return null;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    const displayName = useMemo(() => {
        const u = privyRef.current.user;
        if (!u) return '';
        if (u.google?.name) return u.google.name;
        if (u.apple?.email) return u.apple.email.split('@')[0];
        if (u.email?.address) return u.email.address.split('@')[0];
        if (walletAddress) return walletAddress.toBase58().slice(0, 8) + '...';
        return 'User';
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, walletAddress]);

    const loginMethod = useMemo<AuthState['loginMethod']>(() => {
        const u = privyRef.current.user;
        if (!u) return null;
        if (u.google) return 'google';
        if (u.apple) return 'apple';
        if (u.email) return 'email';
        return null;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    const handleSetRole = useCallback((newRole: UserRole) => {
        setRole(newRole);
        if (newRole) localStorage.setItem('vs-user-role', newRole);
        else localStorage.removeItem('vs-user-role');
    }, []);

    // Stable — never changes identity, always calls latest privy ref
    const handleLogin = useCallback(() => { privyRef.current.login(); }, []);
    const handleLogout = useCallback(() => {
        privyRef.current.logout();
        setRole(null);
        localStorage.removeItem('vs-user-role');
    }, []);

    // Only recompute when these primitives change
    const isReady = privy.ready;
    const isAuth = privy.authenticated;

    const value = useMemo<AuthState>(() => ({
        loading: !isReady,
        authenticated: isAuth,
        walletAddress,
        displayName,
        avatarUrl: null,
        loginMethod,
        role,
        login: handleLogin,
        logout: handleLogout,
        setRole: handleSetRole,
        hasSessionKey: false,
    }), [isReady, isAuth, walletAddress, displayName, loginMethod, role, handleLogin, handleLogout, handleSetRole]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/* ═══════════════════════════════════════════════════
   DEMO AUTH (when no Privy App ID — local dev)
   ═══════════════════════════════════════════════════ */

function DemoAuthProvider({ children }: { children: React.ReactNode }) {
    const [loading, setLoading] = useState(true);
    const [authenticated, setAuthenticated] = useState(false);
    const [walletAddress, setWalletAddress] = useState<PublicKey | null>(null);
    const [displayName, setDisplayName] = useState('');
    const [loginMethod, setLoginMethod] = useState<AuthState['loginMethod']>(null);
    const [role, setRole] = useState<UserRole>(null);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        const savedSession = localStorage.getItem('vs-auth-session');
        if (savedSession) {
            try {
                const s = JSON.parse(savedSession);
                if (s.walletAddress) {
                    setWalletAddress(new PublicKey(s.walletAddress));
                    setDisplayName(s.displayName || '');
                    setLoginMethod(s.loginMethod || 'demo');
                    setRole(s.role || null);
                    setAuthenticated(true);
                }
            } catch { localStorage.removeItem('vs-auth-session'); }
        } else {
            const envMerchant = process.env.NEXT_PUBLIC_MERCHANT_PUBKEY;
            if (envMerchant) {
                try {
                    setWalletAddress(new PublicKey(envMerchant));
                    setDisplayName('Dev Mode');
                    setLoginMethod('demo');
                    setRole('merchant');
                    setAuthenticated(true);
                } catch { }
            }
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
    }, []);

    const handleSetRole = useCallback((newRole: UserRole) => {
        setRole(newRole);
        const saved = localStorage.getItem('vs-auth-session');
        if (saved) {
            try {
                const s = JSON.parse(saved);
                s.role = newRole;
                localStorage.setItem('vs-auth-session', JSON.stringify(s));
            } catch { }
        }
    }, []);

    const handleDemoLogin = useCallback((method: string, name: string) => {
        const pubkey = PublicKey.default;
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
                <DemoLoginModal onClose={() => setShowModal(false)} onLogin={handleDemoLogin} />
            )}
        </AuthContext.Provider>
    );
}

/* ── Demo Login Modal ── */

function DemoLoginModal({ onClose, onLogin }: {
    onClose: () => void;
    onLogin: (method: string, name: string) => void;
}) {
    const [email, setEmail] = useState('');
    const [step, setStep] = useState<'choose' | 'email'>('choose');

    return (
        <div className="auth-modal-overlay" onClick={onClose}>
            <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
                <button className="auth-modal-close" onClick={onClose}>×</button>
                <div className="auth-modal-header">
                    <div className="auth-modal-logo">VS</div>
                    <h2>Welcome to Viral Sync</h2>
                    <p>Sign in to start earning rewards</p>
                </div>
                {step === 'choose' && (
                    <div className="auth-modal-options">
                        <button className="auth-btn auth-btn-google" onClick={() => onLogin('google', 'Google User')}>
                            <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" /><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" /><path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" /><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" /></svg>
                            Continue with Google
                        </button>
                        <button className="auth-btn auth-btn-apple" onClick={() => onLogin('apple', 'Apple User')}>
                            🍎 Continue with Apple
                        </button>
                        <div className="auth-divider"><span>or</span></div>
                        <button className="auth-btn auth-btn-email" onClick={() => setStep('email')}>✉️ Continue with Email</button>
                    </div>
                )}
                {step === 'email' && (
                    <div className="auth-modal-options">
                        <input type="email" className="auth-email-input" placeholder="Enter your email"
                            value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
                        <button className="auth-btn auth-btn-primary"
                            onClick={() => email && onLogin('email', email.split('@')[0])}
                            disabled={!email.includes('@')}>
                            Send Magic Link
                        </button>
                        <button className="auth-btn auth-btn-back" onClick={() => setStep('choose')}>← Back</button>
                    </div>
                )}
                <p className="auth-modal-footer">
                    ⚠️ Demo Mode — no real Privy App ID configured.<br />
                    Set NEXT_PUBLIC_PRIVY_APP_ID for real wallets.
                </p>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   MAIN EXPORT — picks Privy or Demo based on env
   ═══════════════════════════════════════════════════ */

export function AuthProvider({ children }: { children: React.ReactNode }) {
    if (HAS_PRIVY) {
        return (
            <PrivyProvider
                appId={PRIVY_APP_ID}
                config={{
                    appearance: {
                        theme: 'dark',
                        accentColor: '#E07A5F',
                        logo: undefined,
                    },
                    loginMethods: ['google', 'apple', 'email'],
                    embeddedWallets: {
                        solana: {
                            createOnLogin: 'all-users',
                        },
                    },
                }}
            >
                <PrivyAuthInner>{children}</PrivyAuthInner>
            </PrivyProvider>
        );
    }

    return <DemoAuthProvider>{children}</DemoAuthProvider>;
}
