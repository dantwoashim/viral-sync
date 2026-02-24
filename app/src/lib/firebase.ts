'use client';

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, type Auth } from 'firebase/auth';

type FirebaseConfig = {
    apiKey: string;
    authDomain: string;
    projectId: string;
    appId: string;
    storageBucket?: string;
    messagingSenderId?: string;
};

function readFirebaseConfig(): FirebaseConfig | null {
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

    if (!apiKey || !authDomain || !projectId || !appId) {
        return null;
    }

    return {
        apiKey,
        authDomain,
        projectId,
        appId,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    };
}

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;
let persistenceConfigured = false;

export function getFirebaseAuth(): Auth | null {
    const config = readFirebaseConfig();
    if (!config) {
        return null;
    }

    if (!cachedApp) {
        cachedApp = getApps().length > 0 ? getApps()[0] : initializeApp(config);
    }

    if (!cachedAuth) {
        cachedAuth = getAuth(cachedApp);
    }

    if (!persistenceConfigured && typeof window !== 'undefined') {
        persistenceConfigured = true;
        void setPersistence(cachedAuth, browserLocalPersistence).catch(() => {
            // Ignore; auth still works with default persistence.
        });
    }

    return cachedAuth;
}

export function isFirebaseEnabled(): boolean {
    return readFirebaseConfig() !== null;
}
