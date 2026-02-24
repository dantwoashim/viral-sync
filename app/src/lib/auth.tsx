/**
 * Viral Sync - Auth Provider
 *
 * Supports:
 * - Native Google auth on Android/iOS via Capacitor Firebase Authentication
 * - Firebase web auth (popup on desktop, redirect on mobile web)
 * - Demo auth fallback (no backend required)
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Capacitor } from '@capacitor/core';
import { PublicKey, Keypair } from '@solana/web3.js';
import {
    GoogleAuthProvider,
    OAuthProvider,
    getRedirectResult,
    onAuthStateChanged,
    signInWithPopup,
    signInWithRedirect,
    signInWithCredential,
    signOut,
    type Auth as FirebaseAuth,
    type User as FirebaseUser,
} from 'firebase/auth';
import {
    FirebaseAuthentication,
    type User as NativeFirebaseUser,
} from '@capacitor-firebase/authentication';
import { getFirebaseAuth } from './firebase';

// Types

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
    googleEnabled: boolean;
    authError: string | null;
}

type StoredSession = {
    walletAddress?: string;
    displayName?: string;
    loginMethod?: AuthState['loginMethod'];
    role?: UserRole;
};

type InitialSessionState = {
    authenticated: boolean;
    walletAddress: PublicKey | null;
    displayName: string;
    loginMethod: AuthState['loginMethod'];
    role: UserRole;
};

type GoogleAuthFlow = 'popup-first' | 'redirect-first';

const defaultAuth: AuthState = {
    loading: false,
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
    googleEnabled: false,
    authError: null,
};

const AUTH_STORAGE_KEY = 'vs-auth-session';
const ROLE_STORAGE_KEY = 'vs-user-role';

function parseRole(value: unknown): UserRole {
    return value === 'consumer' || value === 'merchant' ? value : null;
}

function parseLoginMethod(value: unknown): AuthState['loginMethod'] {
    return value === 'google' || value === 'apple' || value === 'email' || value === 'demo'
        ? value
        : null;
}

function readStoredRole(): UserRole {
    if (typeof window === 'undefined') {
        return null;
    }
    return parseRole(window.localStorage.getItem(ROLE_STORAGE_KEY));
}

function persistStoredRole(role: UserRole): void {
    if (typeof window === 'undefined') {
        return;
    }
    if (role) {
        window.localStorage.setItem(ROLE_STORAGE_KEY, role);
    } else {
        window.localStorage.removeItem(ROLE_STORAGE_KEY);
    }
}

function clearStoredSession(): void {
    if (typeof window === 'undefined') {
        return;
    }
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

function persistStoredSession(session: StoredSession): void {
    if (typeof window === 'undefined') {
        return;
    }
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

function readStoredSession(): InitialSessionState {
    const empty: InitialSessionState = {
        authenticated: false,
        walletAddress: null,
        displayName: '',
        loginMethod: null,
        role: readStoredRole(),
    };

    if (typeof window === 'undefined') {
        return empty;
    }

    try {
        const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
        if (!raw) {
            return empty;
        }

        const parsed = JSON.parse(raw) as StoredSession;
        if (!parsed.walletAddress) {
            return empty;
        }

        const loginMethod = parseLoginMethod(parsed.loginMethod);
        if (!loginMethod) {
            return empty;
        }

        return {
            authenticated: true,
            walletAddress: new PublicKey(parsed.walletAddress),
            displayName: parsed.displayName || '',
            loginMethod,
            role: parseRole(parsed.role) || readStoredRole(),
        };
    } catch {
        clearStoredSession();
        return empty;
    }
}

function deriveWalletFromStableId(stableId: string): PublicKey {
    const bytes = new Uint8Array(32);
    for (let i = 0; i < stableId.length; i += 1) {
        const code = stableId.charCodeAt(i) & 0xff;
        const a = i % 32;
        const b = (i * 7) % 32;
        bytes[a] = (bytes[a] + code + (i & 0xff)) & 0xff;
        bytes[b] = (bytes[b] ^ ((code * 31) & 0xff)) & 0xff;
    }
    bytes[0] ^= 0x42;
    bytes[31] ^= 0x99;
    return new PublicKey(bytes);
}

function pickOAuthFlow(): GoogleAuthFlow {
    if (typeof window === 'undefined') {
        return 'popup-first';
    }
    if (Capacitor.isNativePlatform()) {
        return 'redirect-first';
    }
    const ua = window.navigator.userAgent.toLowerCase();
    return /android|iphone|ipad|ipod/.test(ua) ? 'redirect-first' : 'popup-first';
}

function detectLoginMethod(user: FirebaseUser): AuthState['loginMethod'] {
    const providerIds = user.providerData.map((entry) => entry.providerId);
    if (providerIds.includes('apple.com')) {
        return 'apple';
    }
    if (providerIds.includes('google.com')) {
        return 'google';
    }
    if (providerIds.includes('password')) {
        return 'email';
    }
    return 'google';
}

function detectNativeLoginMethod(user: NativeFirebaseUser): AuthState['loginMethod'] {
    const providerIds = [
        user.providerId,
        ...user.providerData.map((entry) => entry.providerId),
    ].filter((providerId): providerId is string => Boolean(providerId));

    if (providerIds.includes('apple.com')) {
        return 'apple';
    }
    if (providerIds.includes('google.com')) {
        return 'google';
    }
    if (providerIds.includes('password')) {
        return 'email';
    }
    return 'google';
}

function humanizeAuthError(error: unknown): string {
    const code = (error as { code?: string })?.code || '';
    const message = (error as { message?: string })?.message || '';
    const normalizedMessage = message.toLowerCase();

    if (code.includes('popup-blocked')) {
        return 'Popup blocked. Allow popups or try redirect sign-in.';
    }
    if (code.includes('popup-closed-by-user')) {
        return 'Google sign-in was cancelled.';
    }
    if (code.includes('cancelled-popup-request')) {
        return 'Another sign-in request is already in progress.';
    }
    if (code.includes('unauthorized-domain')) {
        return 'This domain is not authorized in Firebase Auth settings.';
    }
    if (code.includes('web-storage-unsupported')) {
        return 'Web storage is unavailable. Enable storage/cookies and retry.';
    }
    if (code.includes('network-request-failed')) {
        return 'Network error while connecting to Google.';
    }
    if (code.includes('operation-not-allowed')) {
        return 'This sign-in provider is disabled in Firebase Auth.';
    }
    if (code.includes('sign_in_canceled') || normalizedMessage.includes('cancel')) {
        return 'Sign-in was cancelled.';
    }
    if (code.includes('developer_error') || normalizedMessage.includes('developer error')) {
        return 'Google sign-in is misconfigured. Verify SHA fingerprints and OAuth client IDs in Firebase.';
    }
    if (normalizedMessage.includes('12500') || normalizedMessage.includes('12501') || normalizedMessage.includes('12502')) {
        return 'Google sign-in failed. Verify Play Services and Firebase OAuth configuration.';
    }
    if (normalizedMessage.includes('10:')) {
        return 'Google sign-in config mismatch. Re-download google-services.json after adding SHA fingerprints.';
    }

    return message || 'Authentication failed. Please try again.';
}

function applyFirebaseUserToState(
    user: FirebaseUser,
    role: UserRole,
    setAuthenticated: (value: boolean) => void,
    setWalletAddress: (value: PublicKey | null) => void,
    setDisplayName: (value: string) => void,
    setLoginMethod: (value: AuthState['loginMethod']) => void,
): void {
    const loginMethod = detectLoginMethod(user);
    const mappedWallet = deriveWalletFromStableId(`${loginMethod}:${user.uid}`);
    const mappedName = user.displayName || user.email?.split('@')[0] || 'User';

    setAuthenticated(true);
    setWalletAddress(mappedWallet);
    setDisplayName(mappedName);
    setLoginMethod(loginMethod);

    persistStoredSession({
        walletAddress: mappedWallet.toBase58(),
        displayName: mappedName,
        loginMethod,
        role,
    });
}

function applyNativeUserToState(
    user: NativeFirebaseUser,
    role: UserRole,
    setAuthenticated: (value: boolean) => void,
    setWalletAddress: (value: PublicKey | null) => void,
    setDisplayName: (value: string) => void,
    setLoginMethod: (value: AuthState['loginMethod']) => void,
): void {
    const loginMethod = detectNativeLoginMethod(user);
    const mappedWallet = deriveWalletFromStableId(`${loginMethod}:${user.uid}`);
    const mappedName = user.displayName || user.email?.split('@')[0] || 'User';

    setAuthenticated(true);
    setWalletAddress(mappedWallet);
    setDisplayName(mappedName);
    setLoginMethod(loginMethod);

    persistStoredSession({
        walletAddress: mappedWallet.toBase58(),
        displayName: mappedName,
        loginMethod,
        role,
    });
}

function restoreStoredSessionOrSignOut(
    setAuthenticated: (value: boolean) => void,
    setWalletAddress: (value: PublicKey | null) => void,
    setDisplayName: (value: string) => void,
    setLoginMethod: (value: AuthState['loginMethod']) => void,
    setRole: (value: UserRole) => void,
): void {
    const stored = readStoredSession();
    if (stored.authenticated && stored.walletAddress && stored.loginMethod) {
        setAuthenticated(true);
        setWalletAddress(stored.walletAddress);
        setDisplayName(stored.displayName);
        setLoginMethod(stored.loginMethod);
        setRole(stored.role);
        return;
    }

    clearStoredSession();
    setAuthenticated(false);
    setWalletAddress(null);
    setDisplayName('');
    setLoginMethod(null);
    setRole(readStoredRole());
}

const AuthContext = createContext<AuthState>(defaultAuth);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const firebaseAuth = useMemo<FirebaseAuth | null>(() => getFirebaseAuth(), []);
    const [initialSession] = useState<InitialSessionState>(() => readStoredSession());

    const [loading, setLoading] = useState<boolean>(Boolean(firebaseAuth));
    const [authenticated, setAuthenticated] = useState(initialSession.authenticated);
    const [walletAddress, setWalletAddress] = useState<PublicKey | null>(initialSession.walletAddress);
    const [displayName, setDisplayName] = useState(initialSession.displayName);
    const [loginMethod, setLoginMethod] = useState<AuthState['loginMethod']>(initialSession.loginMethod);
    const [role, setRole] = useState<UserRole>(initialSession.role);
    const [showModal, setShowModal] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);
    const [authBusy, setAuthBusy] = useState(false);

    useEffect(() => {
        if (!firebaseAuth) {
            setLoading(false);
            return;
        }

        let mounted = true;

        if (!Capacitor.isNativePlatform()) {
            void getRedirectResult(firebaseAuth).catch((error) => {
                if (mounted) {
                    setAuthError(humanizeAuthError(error));
                    setAuthBusy(false);
                }
            });
        }

        const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
            if (!mounted) {
                return;
            }

            const roleFromStorage = readStoredRole();
            setRole((currentRole) => (currentRole === roleFromStorage ? currentRole : roleFromStorage));

            if (user) {
                applyFirebaseUserToState(
                    user,
                    roleFromStorage,
                    setAuthenticated,
                    setWalletAddress,
                    setDisplayName,
                    setLoginMethod,
                );
                setAuthError(null);
                setShowModal(false);
                setLoading(false);
                setAuthBusy(false);
                return;
            }

            if (Capacitor.isNativePlatform()) {
                void FirebaseAuthentication.getCurrentUser()
                    .then((result) => {
                        if (!mounted) {
                            return;
                        }

                        if (result.user) {
                            applyNativeUserToState(
                                result.user,
                                roleFromStorage,
                                setAuthenticated,
                                setWalletAddress,
                                setDisplayName,
                                setLoginMethod,
                            );
                            setAuthError(null);
                            setShowModal(false);
                        } else {
                            restoreStoredSessionOrSignOut(
                                setAuthenticated,
                                setWalletAddress,
                                setDisplayName,
                                setLoginMethod,
                                setRole,
                            );
                        }

                        setLoading(false);
                        setAuthBusy(false);
                    })
                    .catch(() => {
                        if (!mounted) {
                            return;
                        }

                        restoreStoredSessionOrSignOut(
                            setAuthenticated,
                            setWalletAddress,
                            setDisplayName,
                            setLoginMethod,
                            setRole,
                        );
                        setLoading(false);
                        setAuthBusy(false);
                    });
                return;
            }

            restoreStoredSessionOrSignOut(
                setAuthenticated,
                setWalletAddress,
                setDisplayName,
                setLoginMethod,
                setRole,
            );
            setLoading(false);
            setAuthBusy(false);
        });

        return () => {
            mounted = false;
            unsubscribe();
        };
    }, [firebaseAuth]);

    const login = useCallback(() => {
        if (authBusy) {
            return;
        }
        setAuthError(null);
        setShowModal(true);
    }, [authBusy]);

    const loginWithGoogle = useCallback(async () => {
        if (!firebaseAuth) {
            setAuthError('Google sign-in is not configured. Add Firebase env vars first.');
            return;
        }
        if (authBusy) {
            return;
        }

        setAuthError(null);
        setShowModal(false);
        setAuthBusy(true);

        if (Capacitor.isNativePlatform()) {
            try {
                const nativeResult = await FirebaseAuthentication.signInWithGoogle();
                const idToken = nativeResult.credential?.idToken;
                const accessToken = nativeResult.credential?.accessToken;

                if (idToken) {
                    const credential = GoogleAuthProvider.credential(idToken, accessToken);
                    await signInWithCredential(firebaseAuth, credential);
                } else {
                    throw new Error('Google sign-in returned no ID token.');
                }

                setAuthError(null);
                setShowModal(false);
                setAuthBusy(false);
                return;
            } catch (error) {
                setAuthError(humanizeAuthError(error));
                setAuthBusy(false);
                setShowModal(true);
                return;
            }
        }

        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const flow = pickOAuthFlow();

        try {
            if (flow === 'redirect-first') {
                await signInWithRedirect(firebaseAuth, provider);
                return;
            }
            await signInWithPopup(firebaseAuth, provider);
        } catch (error) {
            const code = (error as { code?: string })?.code || '';
            const shouldFallbackToRedirect =
                code.includes('popup') || code.includes('operation-not-supported');
            const shouldFallbackToPopup =
                code.includes('web-storage-unsupported') || code.includes('auth/argument-error');

            if (flow === 'popup-first' && shouldFallbackToRedirect) {
                try {
                    await signInWithRedirect(firebaseAuth, provider);
                    return;
                } catch (redirectError) {
                    setAuthError(humanizeAuthError(redirectError));
                }
            } else if (flow === 'redirect-first' && shouldFallbackToPopup) {
                try {
                    await signInWithPopup(firebaseAuth, provider);
                    return;
                } catch (popupError) {
                    setAuthError(humanizeAuthError(popupError));
                }
            } else {
                setAuthError(humanizeAuthError(error));
            }

            setAuthBusy(false);
            setShowModal(true);
        }
    }, [firebaseAuth, authBusy]);

    const loginWithApple = useCallback(async () => {
        if (!firebaseAuth) {
            setAuthError('Apple sign-in is not configured. Add Firebase env vars first.');
            return;
        }
        if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
            setAuthError('Apple sign-in is not available on Android. Use Google sign-in.');
            return;
        }
        if (authBusy) {
            return;
        }

        setAuthError(null);
        setShowModal(false);
        setAuthBusy(true);

        const provider = new OAuthProvider('apple.com');
        provider.addScope('email');
        provider.addScope('name');
        const flow = pickOAuthFlow();

        try {
            if (flow === 'redirect-first') {
                await signInWithRedirect(firebaseAuth, provider);
                return;
            }
            await signInWithPopup(firebaseAuth, provider);
        } catch (error) {
            const code = (error as { code?: string })?.code || '';
            const shouldFallbackToRedirect =
                code.includes('popup') || code.includes('operation-not-supported');
            const shouldFallbackToPopup =
                code.includes('web-storage-unsupported') || code.includes('auth/argument-error');

            if (flow === 'popup-first' && shouldFallbackToRedirect) {
                try {
                    await signInWithRedirect(firebaseAuth, provider);
                    return;
                } catch (redirectError) {
                    setAuthError(humanizeAuthError(redirectError));
                }
            } else if (flow === 'redirect-first' && shouldFallbackToPopup) {
                try {
                    await signInWithPopup(firebaseAuth, provider);
                    return;
                } catch (popupError) {
                    setAuthError(humanizeAuthError(popupError));
                }
            } else {
                setAuthError(humanizeAuthError(error));
            }

            setAuthBusy(false);
            setShowModal(true);
        }
    }, [firebaseAuth, authBusy]);

    const loginWithDemo = useCallback((name: string) => {
        const trimmed = name.trim();
        if (!trimmed) {
            return;
        }

        const pubkey = Keypair.generate().publicKey;
        setWalletAddress(pubkey);
        setDisplayName(trimmed);
        setLoginMethod('demo');
        setAuthenticated(true);
        setShowModal(false);
        setAuthError(null);

        persistStoredSession({
            walletAddress: pubkey.toBase58(),
            displayName: trimmed,
            loginMethod: 'demo',
            role,
        });
    }, [role]);

    const logout = useCallback(() => {
        const doLogout = async () => {
            if (Capacitor.isNativePlatform()) {
                try {
                    await FirebaseAuthentication.signOut();
                } catch {
                    // Ignore native sign-out failures and continue local cleanup.
                }
            }

            if (firebaseAuth?.currentUser) {
                try {
                    await signOut(firebaseAuth);
                } catch {
                    // Ignore signout failures and continue local cleanup.
                }
            }

            setAuthenticated(false);
            setWalletAddress(null);
            setDisplayName('');
            setLoginMethod(null);
            setRole(null);
            setShowModal(false);
            setAuthError(null);
            setAuthBusy(false);
            clearStoredSession();
            persistStoredRole(null);
            if (typeof window !== 'undefined') {
                window.localStorage.removeItem('vs-pending-role');
            }
        };

        void doLogout();
    }, [firebaseAuth]);

    const handleSetRole = useCallback((newRole: UserRole) => {
        setRole(newRole);
        persistStoredRole(newRole);
        if (typeof window === 'undefined') {
            return;
        }

        try {
            const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
            if (!raw) {
                return;
            }
            const parsed = JSON.parse(raw) as StoredSession;
            parsed.role = newRole;
            persistStoredSession(parsed);
        } catch {
            // Ignore malformed payloads; auth will rebuild session on next login.
        }
    }, []);

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
        googleEnabled: Boolean(firebaseAuth),
        authError,
    }), [
        loading,
        authenticated,
        walletAddress,
        displayName,
        loginMethod,
        role,
        login,
        logout,
        handleSetRole,
        firebaseAuth,
        authError,
    ]);

    return (
        <AuthContext.Provider value={value}>
            {children}
            {showModal && (
                <LoginModal
                    onClose={() => setShowModal(false)}
                    onGoogle={loginWithGoogle}
                    onApple={loginWithApple}
                    onDemo={loginWithDemo}
                    googleEnabled={Boolean(firebaseAuth)}
                    appleEnabled={!Capacitor.isNativePlatform() || Capacitor.getPlatform() === 'ios'}
                    error={authError}
                    busy={authBusy}
                />
            )}
        </AuthContext.Provider>
    );
}

function LoginModal({
    onClose,
    onGoogle,
    onApple,
    onDemo,
    googleEnabled,
    appleEnabled,
    error,
    busy,
}: {
    onClose: () => void;
    onGoogle: () => Promise<void>;
    onApple: () => Promise<void>;
    onDemo: (name: string) => void;
    googleEnabled: boolean;
    appleEnabled: boolean;
    error: string | null;
    busy: boolean;
}) {
    const [name, setName] = useState('');

    const handleDemoSubmit = () => {
        onDemo(name);
    };

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                background: 'rgba(0,0,0,0.72)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 20,
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: 'var(--scroll)',
                    border: '1px solid var(--border)',
                    borderRadius: 20,
                    padding: 24,
                    maxWidth: 400,
                    width: '100%',
                    boxShadow: '0 24px 80px rgba(0,0,0,0.45)',
                }}
                onClick={(event) => event.stopPropagation()}
            >
                <div style={{ textAlign: 'center', marginBottom: 18 }}>
                    <div
                        style={{
                            width: 52,
                            height: 52,
                            borderRadius: 14,
                            background: 'linear-gradient(135deg, var(--crimson), var(--gold))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 10px',
                            color: '#fff',
                            fontWeight: 900,
                            fontSize: 22,
                        }}
                    >
                        V
                    </div>
                    <h2 style={{ fontSize: 18, marginBottom: 4 }}>Sign In</h2>
                    <p style={{ fontSize: 13, color: 'var(--text-2)' }}>
                        Use Google for persistent identity, or continue with a demo wallet.
                    </p>
                </div>

                {googleEnabled ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10, marginBottom: 14 }}>
                        <button
                            onClick={() => { void onGoogle(); }}
                            disabled={busy}
                            style={{
                                width: '100%',
                                padding: '12px 14px',
                                borderRadius: 12,
                                background: 'linear-gradient(135deg, #ffffff, #ececec)',
                                color: '#222',
                                fontWeight: 700,
                                opacity: busy ? 0.6 : 1,
                            }}
                        >
                            {busy ? 'Opening Sign-In...' : 'Continue with Google'}
                        </button>
                        {appleEnabled && (
                            <button
                                onClick={() => { void onApple(); }}
                                disabled={busy}
                                style={{
                                    width: '100%',
                                    padding: '12px 14px',
                                    borderRadius: 12,
                                    background: '#111111',
                                    color: '#ffffff',
                                    fontWeight: 700,
                                    opacity: busy ? 0.6 : 1,
                                }}
                            >
                                {busy ? 'Opening Sign-In...' : 'Continue with Apple'}
                            </button>
                        )}
                    </div>
                ) : (
                    <div
                        style={{
                            marginBottom: 14,
                            fontSize: 12,
                            color: 'var(--text-3)',
                            background: 'var(--mist)',
                            border: '1px solid var(--border)',
                            borderRadius: 10,
                            padding: '8px 10px',
                        }}
                    >
                        OAuth sign-in is disabled until Firebase env vars are configured.
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                    <input
                        type="text"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Demo name"
                        style={{
                            padding: '12px 14px',
                            borderRadius: 10,
                            background: 'var(--mist)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-1)',
                            outline: 'none',
                        }}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                handleDemoSubmit();
                            }
                        }}
                    />
                    <button
                        onClick={handleDemoSubmit}
                        disabled={!name.trim() || busy}
                        style={{
                            padding: '12px 14px',
                            borderRadius: 10,
                            fontWeight: 700,
                            background: name.trim() && !busy ? 'linear-gradient(135deg, var(--gold), var(--dawn))' : 'var(--mist)',
                            color: name.trim() && !busy ? 'var(--ink)' : 'var(--text-3)',
                        }}
                    >
                        Demo
                    </button>
                </div>

                {error && (
                    <div style={{ marginTop: 12, fontSize: 12, color: 'var(--crimson)' }}>
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
}
