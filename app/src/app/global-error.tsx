'use client';

import React from 'react';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html lang="en">
            <body
                style={{
                    margin: 0,
                    minHeight: '100dvh',
                    display: 'grid',
                    placeItems: 'center',
                    background: '#0b0a12',
                    color: '#e8e4d9',
                    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                    padding: 24,
                }}
            >
                <main style={{ maxWidth: 480, textAlign: 'center' }}>
                    <h1 style={{ margin: 0, fontSize: 28 }}>Something went wrong</h1>
                    <p style={{ margin: '12px 0 20px', opacity: 0.75, fontSize: 14 }}>
                        {error.message || 'Unexpected application error.'}
                    </p>
                    <button
                        onClick={() => reset()}
                        style={{
                            padding: '10px 14px',
                            borderRadius: 10,
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            background: 'rgba(255, 255, 255, 0.08)',
                            color: '#fff',
                            fontWeight: 700,
                        }}
                    >
                        Try again
                    </button>
                </main>
            </body>
        </html>
    );
}
