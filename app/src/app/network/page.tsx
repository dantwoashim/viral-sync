'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { GitBranch, Filter, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';
import { useNetworkGraph, useMerchantConfig } from '@/lib/hooks';
import { shortenAddress, formatTokenAmount } from '@/lib/solana';
import { useWallet } from '@/lib/useWallet';
import type { NetworkNode } from '@/lib/types';

export default function NetworkPage() {
    const wallet = useWallet();
    const config = useMerchantConfig(wallet);
    const mint = config.data?.mint ?? null;
    const graph = useNetworkGraph(mint);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hovered, setHovered] = useState<NetworkNode | null>(null);
    const [filter, setFilter] = useState<'all' | 'active' | 'suspicious'>('all');

    const nodes = graph.data?.nodes ?? [];
    const edges = graph.data?.edges ?? [];

    // Filter nodes
    const filteredNodes = nodes.filter((n) => {
        if (filter === 'active') return n.gen1Balance + n.gen2Balance > 0;
        if (filter === 'suspicious') return n.deadBalance > n.gen1Balance;
        return true;
    });

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        // Background
        const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim() || '#FAFAF8';
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, rect.width, rect.height);

        // Edges
        ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border-secondary').trim() || '#ddd';
        ctx.lineWidth = 1;
        edges.forEach((e) => {
            const from = filteredNodes.find(n => n.id === e.from);
            const to = filteredNodes.find(n => n.id === e.to);
            if (from && to) {
                ctx.beginPath();
                ctx.moveTo(from.x, from.y);
                ctx.lineTo(to.x, to.y);
                ctx.stroke();
            }
        });

        // Nodes
        const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent-primary').trim() || '#E07A5F';
        const success = getComputedStyle(document.documentElement).getPropertyValue('--success').trim() || '#4ECDC4';
        const danger = getComputedStyle(document.documentElement).getPropertyValue('--danger').trim() || '#E76F51';
        const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim() || '#333';

        filteredNodes.forEach((node) => {
            const totalBalance = node.gen1Balance + node.gen2Balance;
            const radius = Math.max(6, Math.min(20, Math.sqrt(totalBalance / 1e6)));
            const color = node.deadBalance > node.gen1Balance ? danger
                : node.gen2Balance > 0 ? success : accent;

            ctx.beginPath();
            ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
            ctx.fillStyle = color + '33';
            ctx.fill();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.stroke();

            // Label
            ctx.fillStyle = textColor;
            ctx.font = '10px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(shortenAddress(node.address, 3), node.x, node.y + radius + 14);
        });

        // Hovered node tooltip
        if (hovered) {
            const ttx = Math.min(hovered.x + 10, rect.width - 180);
            const tty = Math.max(hovered.y - 80, 10);
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-card').trim() || '#fff';
            ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border-primary').trim();
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(ttx, tty, 170, 70, 8);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = textColor;
            ctx.font = 'bold 11px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(shortenAddress(hovered.address, 6), ttx + 8, tty + 18);
            ctx.font = '10px "JetBrains Mono", monospace';
            ctx.fillText(`Gen-1: ${formatTokenAmount(hovered.gen1Balance)}`, ttx + 8, tty + 34);
            ctx.fillText(`Gen-2: ${formatTokenAmount(hovered.gen2Balance)}`, ttx + 8, tty + 48);
            ctx.fillText(`Dead: ${formatTokenAmount(hovered.deadBalance)}`, ttx + 8, tty + 62);
        }
    }, [filteredNodes, edges, hovered]);

    useEffect(() => { draw(); }, [draw]);

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const found = filteredNodes.find(n => Math.hypot(n.x - x, n.y - y) < 20);
        setHovered(found || null);
    };

    return (
        <div className="page-content">
            <div className="page-header">
                <div>
                    <h1>Network Graph</h1>
                    <p>{filteredNodes.length} wallets holding tokens{mint ? ` for mint ${shortenAddress(mint.toBase58(), 6)}` : ''}</p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    {(['all', 'active', 'suspicious'] as const).map((f) => (
                        <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setFilter(f)}>
                            {f === 'all' && <Filter size={13} />}
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="chart-card" style={{ padding: 0, overflow: 'hidden' }}>
                {graph.loading && (
                    <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                        <RefreshCw size={24} className="spin" style={{ marginBottom: 'var(--space-3)' }} />
                        <p>Fetching TokenGeneration accounts from Solana…</p>
                    </div>
                )}
                {!graph.loading && filteredNodes.length === 0 && (
                    <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                        <GitBranch size={32} style={{ marginBottom: 'var(--space-3)' }} />
                        <p>No token holders found. Deploy and issue tokens to see the network graph.</p>
                    </div>
                )}
                <canvas
                    ref={canvasRef}
                    style={{ width: '100%', height: 500, display: filteredNodes.length > 0 ? 'block' : 'none', cursor: hovered ? 'pointer' : 'crosshair' }}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={() => setHovered(null)}
                />
            </div>

            {/* Network Stats */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginTop: 'var(--space-4)' }}>
                {[
                    { label: 'Total Wallets', value: nodes.length },
                    { label: 'Active Holders', value: nodes.filter(n => n.gen1Balance + n.gen2Balance > 0).length },
                    { label: 'Gen-2 Holders', value: nodes.filter(n => n.gen2Balance > 0).length },
                    { label: 'Dead Balance Wallets', value: nodes.filter(n => n.deadBalance > 0).length },
                ].map((s, i) => (
                    <motion.div key={s.label} className="stat-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                        <span className="stat-label">{s.label}</span>
                        <div className="stat-value">{s.value}</div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
