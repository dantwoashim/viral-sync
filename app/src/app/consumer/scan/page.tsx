'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ScanLine,
    Nfc,
    QrCode,
    CheckCircle,
    XCircle,
    Loader2,
    ArrowDown,
    Shield,
    MapPin,
} from 'lucide-react';

type ScanState = 'idle' | 'scanning' | 'verifying' | 'success' | 'error';

export default function ScanPage() {
    const [scanState, setScanState] = useState<ScanState>('idle');
    const [scanMode, setScanMode] = useState<'qr' | 'nfc'>('qr');

    const simulateScan = () => {
        setScanState('scanning');
        setTimeout(() => {
            setScanState('verifying');
            setTimeout(() => {
                setScanState(Math.random() > 0.2 ? 'success' : 'error');
            }, 1800);
        }, 2000);
    };

    const reset = () => setScanState('idle');

    return (
        <div className="consumer-page" style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 140px)' }}>
            {/* Mode Toggle */}
            <motion.div
                className="tabs"
                style={{ width: '100%', marginBottom: 'var(--space-5)' }}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <button
                    className={`tab ${scanMode === 'qr' ? 'active' : ''}`}
                    style={{ flex: 1, textAlign: 'center' }}
                    onClick={() => { setScanMode('qr'); reset(); }}
                >
                    <QrCode size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '6px' }} />
                    QR Code
                </button>
                <button
                    className={`tab ${scanMode === 'nfc' ? 'active' : ''}`}
                    style={{ flex: 1, textAlign: 'center' }}
                    onClick={() => { setScanMode('nfc'); reset(); }}
                >
                    <Nfc size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '6px' }} />
                    NFC Tap
                </button>
            </motion.div>

            {/* Scanner Area */}
            <motion.div
                className="consumer-scanner-area"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
            >
                <AnimatePresence mode="wait">
                    {scanState === 'idle' && (
                        <motion.div
                            key="idle"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            style={{ textAlign: 'center' }}
                        >
                            {/* Scanner Frame */}
                            <div className="consumer-scanner-frame">
                                {scanMode === 'qr' ? (
                                    <QrCode size={64} style={{ color: 'var(--accent-primary)', opacity: 0.4 }} />
                                ) : (
                                    <Nfc size={64} style={{ color: 'var(--accent-primary)', opacity: 0.4 }} />
                                )}
                                {/* Corner markers */}
                                <div className="scanner-corner top-left" />
                                <div className="scanner-corner top-right" />
                                <div className="scanner-corner bottom-left" />
                                <div className="scanner-corner bottom-right" />
                            </div>

                            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: 'var(--space-5)' }}>
                                {scanMode === 'qr' ? 'Scan POS Code' : 'Tap to Redeem'}
                            </h2>
                            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: 'var(--space-2)', maxWidth: 280 }}>
                                {scanMode === 'qr'
                                    ? 'Point your camera at the merchant QR code to redeem your $BREW tokens'
                                    : 'Hold your phone near the NFC terminal to initiate redemption'}
                            </p>

                            <button className="btn btn-primary btn-lg" style={{ marginTop: 'var(--space-6)', width: '100%', maxWidth: 280 }} onClick={simulateScan}>
                                <ScanLine size={18} />
                                {scanMode === 'qr' ? 'Start Scanning' : 'Enable NFC'}
                            </button>
                        </motion.div>
                    )}

                    {scanState === 'scanning' && (
                        <motion.div
                            key="scanning"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            style={{ textAlign: 'center' }}
                        >
                            <div className="consumer-scanner-frame scanning">
                                {scanMode === 'qr' ? (
                                    <ScanLine size={64} style={{ color: 'var(--accent-primary)' }} />
                                ) : (
                                    <Nfc size={64} style={{ color: 'var(--accent-primary)' }} />
                                )}
                                <div className="scanner-corner top-left" />
                                <div className="scanner-corner top-right" />
                                <div className="scanner-corner bottom-left" />
                                <div className="scanner-corner bottom-right" />
                                <div className="scanner-sweep" />
                            </div>
                            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: 'var(--space-5)' }}>
                                {scanMode === 'qr' ? 'Scanning...' : 'Waiting for NFC...'}
                            </h2>
                            <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', marginTop: 'var(--space-2)' }}>
                                {scanMode === 'qr' ? 'Hold steady' : 'Keep your phone near the terminal'}
                            </p>
                        </motion.div>
                    )}

                    {scanState === 'verifying' && (
                        <motion.div
                            key="verifying"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            style={{ textAlign: 'center' }}
                        >
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                                style={{ marginBottom: 'var(--space-5)' }}
                            >
                                <Loader2 size={64} style={{ color: 'var(--accent-primary)' }} />
                            </motion.div>
                            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>Verifying on-chain...</h2>
                            <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', marginTop: 'var(--space-2)' }}>
                                Checking geo-attestation & balance
                            </p>
                            <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center', marginTop: 'var(--space-4)' }}>
                                <span className="badge badge-accent"><Shield size={10} /> Attestation</span>
                                <span className="badge badge-accent"><MapPin size={10} /> Geofence</span>
                            </div>
                        </motion.div>
                    )}

                    {scanState === 'success' && (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            style={{ textAlign: 'center' }}
                        >
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 200, damping: 12 }}
                            >
                                <div style={{
                                    width: 96, height: 96, borderRadius: '50%',
                                    background: 'var(--success-subtle)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    margin: '0 auto var(--space-5)',
                                }}>
                                    <CheckCircle size={48} style={{ color: 'var(--success-text)' }} />
                                </div>
                            </motion.div>
                            <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--success-text)' }}>Redeemed!</h2>
                            <div className="text-mono" style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)', margin: 'var(--space-3) 0' }}>
                                120 $BREW
                            </div>
                            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>at BREW Downtown Flagship</p>
                            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: 'var(--space-1)' }}>
                                Tx: 5FBx...R4cE • Slot 298,472,118
                            </p>
                            <button className="btn btn-secondary btn-lg" style={{ marginTop: 'var(--space-6)', width: '100%', maxWidth: 280 }} onClick={reset}>
                                Done
                            </button>
                        </motion.div>
                    )}

                    {scanState === 'error' && (
                        <motion.div
                            key="error"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            style={{ textAlign: 'center' }}
                        >
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 200, damping: 12 }}
                            >
                                <div style={{
                                    width: 96, height: 96, borderRadius: '50%',
                                    background: 'var(--danger-subtle)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    margin: '0 auto var(--space-5)',
                                }}>
                                    <XCircle size={48} style={{ color: 'var(--danger-text)' }} />
                                </div>
                            </motion.div>
                            <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--danger-text)' }}>Redemption Failed</h2>
                            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: 'var(--space-2)', maxWidth: 280 }}>
                                Geo-attestation could not verify your location. Try moving closer to the store.
                            </p>
                            <button className="btn btn-primary btn-lg" style={{ marginTop: 'var(--space-6)', width: '100%', maxWidth: 280 }} onClick={reset}>
                                Try Again
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
