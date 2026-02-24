'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
    Rocket,
    ShieldCheck,
    AlertTriangle,
    CheckCircle2,
    CircleOff,
    Clock3,
    Copy,
    RefreshCw,
    ArrowRight,
    Flame,
    Sparkles,
    RotateCcw,
    Gauge,
    Shield,
    TrendingUp,
    TrendingDown,
    Minus,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/lib/useWallet';
import {
    useMerchantConfig,
    useMerchantBond,
    useMerchantReputation,
    useViralOracle,
    useDisputeRecords,
} from '@/lib/hooks';
import { bpsToPercent, lamportsToSol, shortenAddress } from '@/lib/solana';
import { checkRelayerHealth } from '@/lib/relayer';

type RelayerState = {
    loading: boolean;
    online: boolean;
    relayerPubkey?: string;
    balance?: number;
    lastChecked?: number;
};

type LaunchCheck = {
    label: string;
    ok: boolean;
    detail: string;
    ctaLabel: string;
    ctaPath: string;
};

type CampaignPreset = {
    id: 'happy-hour' | 'first-purchase' | 'reactivation';
    name: string;
    tag: string;
    summary: string;
    cadence: string;
    focus: 'acquisition' | 'conversion' | 'retention';
    expectedClaimLift: [number, number];
    expectedRedeemLift: [number, number];
    expectedKFactorLift: [number, number];
    ctaPath: string;
};

type GrowthRecommendation = {
    id: string;
    title: string;
    action: string;
    impact: string;
    priority: 'high' | 'medium' | 'low';
};

type FraudAlert = {
    id: string;
    title: string;
    detail: string;
    mitigation: string;
    severity: 'high' | 'medium' | 'low';
};

const HEALTH_POLL_MS = 15_000;
const ORACLE_FRESHNESS_MAX_AGE_SECS = 86_400;
const CAMPAIGN_STORAGE_KEY = 'vs-active-campaign';

const CAMPAIGN_PRESETS: CampaignPreset[] = [
    {
        id: 'happy-hour',
        name: 'Happy Hour Booster',
        tag: 'Fast Conversion',
        summary: 'Boost same-day redemptions during 2-hour high traffic windows.',
        cadence: 'Run 2x/day around peak footfall',
        focus: 'conversion',
        expectedClaimLift: [8, 18],
        expectedRedeemLift: [10, 24],
        expectedKFactorLift: [0.06, 0.16],
        ctaPath: '/pos',
    },
    {
        id: 'first-purchase',
        name: 'First Purchase Push',
        tag: 'New Users',
        summary: 'Prioritize first-time redeemers with low friction claim prompts.',
        cadence: 'Always on for first 7 days',
        focus: 'acquisition',
        expectedClaimLift: [12, 26],
        expectedRedeemLift: [7, 16],
        expectedKFactorLift: [0.08, 0.22],
        ctaPath: '/consumer/scan',
    },
    {
        id: 'reactivation',
        name: 'Dormant Reactivation',
        tag: 'Retention',
        summary: 'Target users with no recent activity using limited-time incentives.',
        cadence: 'Weekly 48h campaign',
        focus: 'retention',
        expectedClaimLift: [5, 12],
        expectedRedeemLift: [11, 21],
        expectedKFactorLift: [0.04, 0.12],
        ctaPath: '/network',
    },
];

const presetFocusUi: Record<CampaignPreset['focus'], {
    icon: React.ComponentType<{ size?: number }>;
    tone: string;
    bg: string;
}> = {
    acquisition: { icon: Sparkles, tone: 'var(--cloud)', bg: 'var(--cloud-soft)' },
    conversion: { icon: Flame, tone: 'var(--gold)', bg: 'var(--gold-soft)' },
    retention: { icon: RotateCcw, tone: 'var(--jade)', bg: 'var(--jade-soft)' },
};

function pctRange([min, max]: [number, number]): string {
    return `+${min}% to +${max}%`;
}

function kRange([min, max]: [number, number]): string {
    return `+${min.toFixed(2)} to +${max.toFixed(2)} K-factor`;
}

export default function LaunchpadPage() {
    const router = useRouter();
    const wallet = useWallet();

    const config = useMerchantConfig(wallet);
    const bond = useMerchantBond(wallet);
    const reputation = useMerchantReputation(wallet);
    const oracle = useViralOracle(wallet);
    const disputes = useDisputeRecords(wallet);
    const dataError = config.error || bond.error || reputation.error || oracle.error || disputes.error;

    const [relayer, setRelayer] = useState<RelayerState>({
        loading: true,
        online: false,
    });
    const [copied, setCopied] = useState(false);
    const [nowUnix, setNowUnix] = useState(() => Math.floor(Date.now() / 1000));
    const [activePresetId, setActivePresetId] = useState<CampaignPreset['id'] | null>(() => {
        if (typeof window === 'undefined') {
            return null;
        }
        const stored = window.localStorage.getItem(CAMPAIGN_STORAGE_KEY);
        if (stored && CAMPAIGN_PRESETS.some((preset) => preset.id === stored)) {
            return stored as CampaignPreset['id'];
        }
        return null;
    });

    const disputeRows = disputes.data ?? [];
    const pendingDisputes = disputeRows.filter((item) => item.status === 'Pending').length;
    const resolvedDisputes = disputeRows.length - pendingDisputes;

    const trustScore = (() => {
        let score = reputation.data?.reputationScore ?? 55;

        if (bond.data && bond.data.bondedLamports < bond.data.minRequiredLamports) {
            score -= 16;
        }

        score -= Math.min(24, pendingDisputes * 8);

        if (reputation.data) {
            score -= Math.max(0, Math.round((reputation.data.suspicionScore - 35) * 0.28));
        }

        return Math.min(100, Math.max(0, score));
    })();

    const trustTrend = (() => {
        const suspicion = reputation.data?.suspicionScore ?? 50;
        if (pendingDisputes > 1 || suspicion >= 60) {
            return 'down' as const;
        }
        if (suspicion <= 35 && pendingDisputes === 0) {
            return 'up' as const;
        }
        return 'flat' as const;
    })();

    const trendUi = trustTrend === 'up'
        ? {
            icon: TrendingUp,
            label: 'Improving',
            tone: 'var(--jade)',
            bg: 'var(--jade-soft)',
        }
        : trustTrend === 'down'
            ? {
                icon: TrendingDown,
                label: 'Declining',
                tone: 'var(--crimson)',
                bg: 'var(--crimson-soft)',
            }
            : {
                icon: Minus,
                label: 'Stable',
                tone: 'var(--gold)',
                bg: 'var(--gold-soft)',
            };

    const fraudAlerts = (() => {
        const alerts: FraudAlert[] = [];
        const rep = reputation.data;

        if (rep?.suspicionScore !== undefined && rep.suspicionScore >= 60) {
            alerts.push({
                id: 'suspicion',
                severity: 'high',
                title: 'Suspicion score elevated',
                detail: `Current suspicion is ${rep.suspicionScore}/100.`,
                mitigation: 'Enforce tighter geofence radius and add two extra attestation servers.',
            });
        }

        if (rep?.commissionConcentrationBps !== undefined && rep.commissionConcentrationBps >= 4200) {
            alerts.push({
                id: 'commission-concentration',
                severity: 'medium',
                title: 'Commission concentration risk',
                detail: `Top-referrer concentration is ${(rep.commissionConcentrationBps / 100).toFixed(1)}%.`,
                mitigation: 'Cap campaign rewards per wallet and prioritize first-time referrers.',
            });
        }

        if (rep?.pctRedemptionsInBusinessHours !== undefined && rep.pctRedemptionsInBusinessHours < 58) {
            alerts.push({
                id: 'off-hours',
                severity: 'medium',
                title: 'Off-hours redemption spike',
                detail: `${rep.pctRedemptionsInBusinessHours}% of redemptions are in business hours.`,
                mitigation: 'Require stronger attestations outside business hours and add manual review queue.',
            });
        }

        if (pendingDisputes > 0) {
            alerts.push({
                id: 'open-disputes',
                severity: pendingDisputes >= 2 ? 'high' : 'medium',
                title: 'Open disputes pending',
                detail: `${pendingDisputes} unresolved dispute(s) detected.`,
                mitigation: 'Resolve pending disputes before demo and top up bond safety margin.',
            });
        }

        if (rep?.uniqueAttestationServersUsed !== undefined && rep.uniqueAttestationServersUsed < 2) {
            alerts.push({
                id: 'attestation-diversity',
                severity: 'low',
                title: 'Low attestation diversity',
                detail: `Only ${rep.uniqueAttestationServersUsed} attestation server(s) active.`,
                mitigation: 'Configure at least 2 attestation providers to reduce spoofing risk.',
            });
        }

        return alerts.slice(0, 4);
    })();

    const geofencePlan = (() => {
        const suspicion = reputation.data?.suspicionScore ?? 45;
        const radiusMeters = suspicion >= 60 ? 70 : suspicion >= 45 ? 100 : 140;
        const attestationMin = suspicion >= 60 ? 3 : 2;
        const businessHoursTarget = suspicion >= 60 ? 78 : 68;

        return {
            radiusMeters,
            attestationMin,
            businessHoursTarget,
        };
    })();

    useEffect(() => {
        const timer = setInterval(() => {
            setNowUnix(Math.floor(Date.now() / 1000));
        }, 30_000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        let mounted = true;

        const runHealthCheck = async () => {
            const health = await checkRelayerHealth();
            if (!mounted) return;
            setRelayer({
                loading: false,
                online: health.online,
                relayerPubkey: health.relayerPubkey,
                balance: health.balance,
                lastChecked: Date.now(),
            });
        };

        void runHealthCheck();
        const timer = setInterval(() => {
            void runHealthCheck();
        }, HEALTH_POLL_MS);

        return () => {
            mounted = false;
            clearInterval(timer);
        };
    }, []);

    const checks = useMemo<LaunchCheck[]>(() => {
        const oracleAge = oracle.data ? nowUnix - oracle.data.computedAt : Number.MAX_SAFE_INTEGER;

        const walletOk = Boolean(wallet);
        const configOk = Boolean(config.data?.isActive);
        const bondOk = Boolean(bond.data && bond.data.bondedLamports >= bond.data.minRequiredLamports);
        const oracleOk = Boolean(oracle.data && oracleAge <= ORACLE_FRESHNESS_MAX_AGE_SECS);
        const reputationOk = Boolean(reputation.data && reputation.data.suspicionScore < 60);
        const relayerOk = relayer.online;

        return [
            {
                label: 'Wallet Connected',
                ok: walletOk,
                detail: walletOk && wallet ? shortenAddress(wallet.toBase58()) : 'Merchant wallet missing',
                ctaLabel: 'Open Settings',
                ctaPath: '/settings',
            },
            {
                label: 'Token Program Active',
                ok: configOk,
                detail: configOk
                    ? `${bpsToPercent(config.data!.commissionRateBps)}% commission • ${config.data!.tokenExpiryDays} day expiry`
                    : 'MerchantConfig not initialized or inactive',
                ctaLabel: 'Configure Oracle',
                ctaPath: '/oracle',
            },
            {
                label: 'Bond Safety Buffer',
                ok: bondOk,
                detail: bond.data
                    ? `${lamportsToSol(bond.data.bondedLamports).toFixed(2)} SOL / required ${lamportsToSol(bond.data.minRequiredLamports).toFixed(2)} SOL`
                    : 'Bond account not found',
                ctaLabel: 'Open Disputes',
                ctaPath: '/disputes',
            },
            {
                label: 'Oracle Freshness',
                ok: oracleOk,
                detail: oracle.data
                    ? `Last update ${Math.max(0, Math.floor(oracleAge / 3600))}h ago`
                    : 'Oracle not computed yet',
                ctaLabel: 'View Oracle',
                ctaPath: '/oracle',
            },
            {
                label: 'Relayer Online',
                ok: relayerOk,
                detail: relayer.loading
                    ? 'Checking relayer health...'
                    : relayerOk
                        ? `Balance ${(relayer.balance ?? 0) / 1_000_000_000} SOL`
                        : 'Relayer unreachable',
                ctaLabel: 'Open Settings',
                ctaPath: '/settings',
            },
            {
                label: 'Fraud Risk Guard',
                ok: reputationOk,
                detail: reputation.data
                    ? `Suspicion score ${reputation.data.suspicionScore}/100`
                    : 'Reputation data unavailable',
                ctaLabel: 'Review Disputes',
                ctaPath: '/disputes',
            },
        ];
    }, [wallet, config.data, bond.data, oracle.data, reputation.data, relayer.online, relayer.loading, relayer.balance, nowUnix]);

    const readinessScore = useMemo(() => {
        const ok = checks.filter((check) => check.ok).length;
        return Math.round((ok / checks.length) * 100);
    }, [checks]);

    const blockers = checks.filter((check) => !check.ok);

    const activePreset = useMemo(
        () => CAMPAIGN_PRESETS.find((preset) => preset.id === activePresetId) ?? null,
        [activePresetId]
    );

    const growthPlaybook = useMemo(() => {
        const tips: string[] = [];

        if (!oracle.data) {
            tips.push('Trigger oracle computation by driving at least a few share -> claim -> redeem cycles today.');
        } else {
            if (oracle.data.kFactor < 100) {
                tips.push('K-factor is below 1.0. Increase referral rewards or simplify first redeem experience.');
            }
            if (oracle.data.claimRate < 40) {
                tips.push('Claim rate is low. Improve claim UX and reduce wallet friction in consumer scan flow.');
            }
            if (oracle.data.firstRedeemRate < 20) {
                tips.push('Redeem rate is weak. Push same-day redemption with POS prompts and limited offers.');
            }
        }

        if (reputation.data && reputation.data.suspicionScore >= 40) {
            tips.push('Suspicion score is rising. Prioritize geofence attestations and business-hours redemptions.');
        }

        if (bond.data && bond.data.bondedLamports < bond.data.minRequiredLamports) {
            tips.push('Top up merchant bond to prevent lockouts during disputes.');
        }

        if (!relayer.online) {
            tips.push('Relayer is offline. Bring it up before demoing gasless checkout.');
        }

        if (tips.length === 0) {
            tips.push('System is healthy. Keep campaign cadence stable and track CAC efficiency versus paid ads.');
        }

        return tips;
    }, [oracle.data, reputation.data, bond.data, relayer.online]);

    const actionableRecommendations = useMemo<GrowthRecommendation[]>(() => {
        const recs: GrowthRecommendation[] = [];

        if (activePreset) {
            recs.push({
                id: `preset-${activePreset.id}`,
                title: `Run ${activePreset.name} now`,
                action: `${activePreset.summary} ${activePreset.cadence}.`,
                impact: `Claim ${pctRange(activePreset.expectedClaimLift)} • Redeem ${pctRange(activePreset.expectedRedeemLift)} • ${kRange(activePreset.expectedKFactorLift)}`,
                priority: 'medium',
            });
        }

        if (!oracle.data) {
            recs.push({
                id: 'oracle-seed',
                title: 'Seed baseline data',
                action: 'Drive 10+ live share -> claim -> redeem events to unlock reliable trend guidance.',
                impact: 'Forecast confidence +20% to +40%',
                priority: 'high',
            });
        } else {
            if (oracle.data.kFactor < 100) {
                recs.push({
                    id: 'kfactor',
                    title: 'Improve referral propagation',
                    action: 'Use first-purchase booster and simplify claim steps in scan flow.',
                    impact: '+0.10 to +0.30 K-factor in 7 days',
                    priority: 'high',
                });
            }
            if (oracle.data.claimRate < 45) {
                recs.push({
                    id: 'claim-rate',
                    title: 'Increase claim completion',
                    action: 'Push claim CTA from scan result and limit steps to one confirmation.',
                    impact: 'Claim rate +8% to +18%',
                    priority: 'high',
                });
            }
            if (oracle.data.firstRedeemRate < 28) {
                recs.push({
                    id: 'redeem-rate',
                    title: 'Accelerate first redeem',
                    action: 'Run timed POS offer windows and highlight expiry urgency in checkout.',
                    impact: 'First redeem rate +10% to +22%',
                    priority: 'medium',
                });
            }
        }

        if (reputation.data && reputation.data.suspicionScore >= 45) {
            recs.push({
                id: 'risk',
                title: 'Lower suspicion score',
                action: 'Favor business-hours redemptions and add more attestation sources.',
                impact: 'Suspicion -8 to -18 points',
                priority: 'medium',
            });
        }

        if (!relayer.online) {
            recs.push({
                id: 'relayer',
                title: 'Restore relayer uptime',
                action: 'Recover relayer service and top up SOL buffer before live demo.',
                impact: 'Failed transactions -70% to -100%',
                priority: 'high',
            });
        }

        if (recs.length === 0) {
            recs.push({
                id: 'steady',
                title: 'Maintain momentum',
                action: 'Keep campaign cadence stable and monitor cohort quality in Oracle + Network pages.',
                impact: 'K-factor stability +/-0.05 with lower variance',
                priority: 'low',
            });
        }

        return recs.slice(0, 5);
    }, [activePreset, oracle.data, reputation.data, relayer.online]);

    const applyPreset = (presetId: CampaignPreset['id']) => {
        setActivePresetId(presetId);
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(CAMPAIGN_STORAGE_KEY, presetId);
        }
    };

    const clearPreset = () => {
        setActivePresetId(null);
        if (typeof window !== 'undefined') {
            window.localStorage.removeItem(CAMPAIGN_STORAGE_KEY);
        }
    };

    const copySnapshot = async () => {
        const lines = [
            '# Viral Sync Command Center Snapshot',
            `- Readiness: ${readinessScore}%`,
            `- Wallet: ${wallet ? wallet.toBase58() : 'missing'}`,
            `- Relayer: ${relayer.online ? 'online' : 'offline'}`,
            `- Active Campaign: ${activePreset ? activePreset.name : 'none'}`,
            `- K-Factor: ${oracle.data ? (oracle.data.kFactor / 100).toFixed(2) : 'n/a'}`,
            `- Claim Rate: ${oracle.data ? `${oracle.data.claimRate}%` : 'n/a'}`,
            `- First Redeem Rate: ${oracle.data ? `${oracle.data.firstRedeemRate}%` : 'n/a'}`,
            `- Reputation Score: ${reputation.data ? reputation.data.reputationScore : 'n/a'}`,
            `- Suspicion Score: ${reputation.data ? reputation.data.suspicionScore : 'n/a'}`,
            `- Trust Score: ${trustScore}/100`,
            `- Pending Disputes: ${pendingDisputes}`,
            `- Active Fraud Alerts: ${fraudAlerts.length}`,
            '',
            '## Immediate Blockers',
            ...blockers.map((blocker) => `- ${blocker.label}: ${blocker.detail}`),
        ];

        await navigator.clipboard.writeText(lines.join('\n'));
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
    };

    const readinessTone = readinessScore >= 85 ? 'var(--jade)' : readinessScore >= 60 ? 'var(--gold)' : 'var(--crimson)';
    const TrendIcon = trendUi.icon;

    return (
        <>
            <div className="page-top">
                <h1>Launchpad</h1>
                <div className="pill pill-gold">Operations</div>
            </div>

            <div className="page-scroll">
                {dataError && (
                    <div className="scroll-card" style={{ padding: 'var(--s4)', marginBottom: 'var(--s4)', borderColor: 'var(--crimson-soft)' }}>
                        <div style={{ fontSize: 13, color: 'var(--crimson)' }}>
                            Launchpad is running with partial data: {dataError}
                        </div>
                    </div>
                )}

                <div className="scroll-card" style={{ padding: 'var(--s5)', marginBottom: 'var(--s4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--s3)' }}>
                        <div>
                            <div className="hero-stat-label">System Readiness</div>
                            <div style={{ fontSize: 42, fontWeight: 900, lineHeight: 1, color: readinessTone }}>
                                {readinessScore}%
                            </div>
                            <div className="hero-stat-sub">
                                {blockers.length === 0 ? 'All critical systems green.' : `${blockers.length} blockers require action.`}
                            </div>
                        </div>
                        <button
                            onClick={() => { void copySnapshot(); }}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '10px 12px',
                                borderRadius: 10,
                                background: 'var(--mist)',
                                border: '1px solid var(--border)',
                                fontSize: 12,
                                fontWeight: 700,
                            }}
                        >
                            <Copy size={14} /> {copied ? 'Copied' : 'Copy Snapshot'}
                        </button>
                    </div>
                </div>

                <div className="section">
                    <div className="section-header">
                        <span className="section-title"><Shield size={14} /> Trust & Compliance</span>
                    </div>
                    <div className="scroll-card" style={{ padding: 'var(--s4)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                            <div>
                                <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                    Merchant Trust Score
                                </div>
                                <div style={{ fontSize: 32, fontWeight: 900, lineHeight: 1 }}>{trustScore}</div>
                            </div>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 999, background: trendUi.bg, color: trendUi.tone, fontSize: 12, fontWeight: 800 }}>
                                <TrendIcon size={13} /> {trendUi.label}
                            </div>
                        </div>

                        <div style={{ marginTop: 10 }} className="progress">
                            <div className="progress-fill" style={{ width: `${trustScore}%`, background: trustScore >= 75 ? 'var(--jade)' : trustScore >= 55 ? 'var(--gold)' : 'var(--crimson)' }} />
                        </div>

                        <div className="metric-row">
                            <span className="metric-label">Bond Coverage</span>
                            <span className="metric-value">
                                {bond.data
                                    ? `${lamportsToSol(bond.data.bondedLamports).toFixed(2)} / ${lamportsToSol(bond.data.minRequiredLamports).toFixed(2)} SOL`
                                    : 'n/a'}
                            </span>
                        </div>
                        <div className="metric-row">
                            <span className="metric-label">Dispute Status</span>
                            <span className="metric-value">{pendingDisputes} pending · {resolvedDisputes} resolved</span>
                        </div>
                        <div className="metric-row">
                            <span className="metric-label">Suspicion Score</span>
                            <span className="metric-value">{reputation.data ? `${reputation.data.suspicionScore}/100` : 'n/a'}</span>
                        </div>
                    </div>
                </div>

                <div className="section" style={{ marginTop: 0 }}>
                    <div className="section-header">
                        <span className="section-title"><ShieldCheck size={14} /> System Checks</span>
                        <button
                            onClick={() => window.location.reload()}
                            className="pill"
                            style={{ background: 'var(--mist)', color: 'var(--text-2)' }}
                        >
                            <RefreshCw size={12} /> Refresh
                        </button>
                    </div>
                    <div className="list-card">
                        {checks.map((check) => (
                            <button
                                key={check.label}
                                className="list-item"
                                style={{ width: '100%', textAlign: 'left' }}
                                onClick={() => router.push(check.ctaPath)}
                            >
                                <div
                                    className="list-item-icon"
                                    style={{
                                        background: check.ok ? 'var(--jade-soft)' : 'var(--crimson-soft)',
                                        color: check.ok ? 'var(--jade)' : 'var(--crimson)',
                                    }}
                                >
                                    {check.ok ? <CheckCircle2 size={16} /> : <CircleOff size={16} />}
                                </div>
                                <div className="list-item-content">
                                    <div className="list-item-title">{check.label}</div>
                                    <div className="list-item-sub">{check.detail}</div>
                                </div>
                                <div className="list-item-right" style={{ color: 'var(--gold)', fontSize: 12, fontWeight: 700 }}>
                                    {check.ctaLabel} <ArrowRight size={12} />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="section">
                    <div className="section-header">
                        <span className="section-title"><Gauge size={14} /> Campaign Presets</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--s3)' }}>
                        {CAMPAIGN_PRESETS.map((preset) => {
                            const focusUi = presetFocusUi[preset.focus];
                            const FocusIcon = focusUi.icon;
                            const isActive = activePresetId === preset.id;

                            return (
                                <div key={preset.id} className="scroll-card" style={{ padding: 'var(--s4)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                        <span className={`pill ${isActive ? 'pill-jade' : 'pill-gold'}`}>
                                            {isActive ? 'Active' : preset.tag}
                                        </span>
                                        <div
                                            style={{
                                                width: 28,
                                                height: 28,
                                                borderRadius: 8,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                background: focusUi.bg,
                                                color: focusUi.tone,
                                            }}
                                        >
                                            <FocusIcon size={14} />
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 6 }}>{preset.name}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 10 }}>{preset.summary}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 10 }}>{preset.cadence}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-2)' }}>
                                        Claim {pctRange(preset.expectedClaimLift)} • Redeem {pctRange(preset.expectedRedeemLift)}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 4, fontWeight: 700 }}>
                                        {kRange(preset.expectedKFactorLift)}
                                    </div>
                                    <button
                                        onClick={() => applyPreset(preset.id)}
                                        style={{
                                            marginTop: 12,
                                            width: '100%',
                                            padding: '9px 10px',
                                            borderRadius: 8,
                                            border: '1px solid var(--border)',
                                            background: isActive ? 'var(--jade-soft)' : 'var(--mist)',
                                            color: isActive ? 'var(--jade)' : 'var(--text-1)',
                                            fontSize: 12,
                                            fontWeight: 800,
                                        }}
                                    >
                                        {isActive ? 'Selected' : 'Activate Preset'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {activePreset && (
                    <div className="section">
                        <div className="scroll-card" style={{ padding: 'var(--s4)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontWeight: 700 }}>
                                <Rocket size={14} color="var(--gold)" /> Active Campaign: {activePreset.name}
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
                                Expected impact this week: claim {pctRange(activePreset.expectedClaimLift)}, redeem {pctRange(activePreset.expectedRedeemLift)}, {kRange(activePreset.expectedKFactorLift)}.
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                                <button
                                    onClick={() => router.push(activePreset.ctaPath)}
                                    style={{
                                        padding: '8px 10px',
                                        borderRadius: 8,
                                        background: 'var(--gold-soft)',
                                        color: 'var(--gold)',
                                        fontSize: 12,
                                        fontWeight: 800,
                                    }}
                                >
                                    Open Execution Lane
                                </button>
                                <button
                                    onClick={clearPreset}
                                    style={{
                                        padding: '8px 10px',
                                        borderRadius: 8,
                                        border: '1px solid var(--border)',
                                        background: 'var(--mist)',
                                        fontSize: 12,
                                        fontWeight: 800,
                                    }}
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="section">
                    <div className="section-header">
                        <span className="section-title"><Rocket size={14} /> Growth Playbook</span>
                    </div>
                    <div className="scroll-card" style={{ padding: 'var(--s4)' }}>
                        {growthPlaybook.map((tip, index) => (
                            <div className="metric-row" key={tip}>
                                <span className="metric-label" style={{ color: 'var(--text-1)' }}>{index + 1}. {tip}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="section">
                    <div className="section-header">
                        <span className="section-title"><Sparkles size={14} /> Actionable Recommendations</span>
                    </div>
                    <div className="scroll-card" style={{ padding: 'var(--s4)' }}>
                        {actionableRecommendations.map((rec, index) => {
                            const priorityClass = rec.priority === 'high'
                                ? 'pill-crimson'
                                : rec.priority === 'medium'
                                    ? 'pill-gold'
                                    : 'pill-jade';

                            return (
                                <div
                                    key={rec.id}
                                    style={{
                                        paddingBottom: index === actionableRecommendations.length - 1 ? 0 : 12,
                                        marginBottom: index === actionableRecommendations.length - 1 ? 0 : 12,
                                        borderBottom: index === actionableRecommendations.length - 1 ? 'none' : '1px solid var(--border)',
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                        <div style={{ fontSize: 14, fontWeight: 700 }}>{rec.title}</div>
                                        <span className={`pill ${priorityClass}`}>{rec.priority}</span>
                                    </div>
                                    <div style={{ marginTop: 6, fontSize: 13, color: 'var(--text-2)' }}>{rec.action}</div>
                                    <div style={{ marginTop: 6, fontSize: 12, color: 'var(--gold)', fontWeight: 700 }}>
                                        Expected impact: {rec.impact}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="section">
                    <div className="section-header">
                        <span className="section-title"><Shield size={14} /> Geofence & Attestation Hints</span>
                    </div>
                    <div className="scroll-card" style={{ padding: 'var(--s4)' }}>
                        <div className="metric-row">
                            <span className="metric-label">Recommended Radius</span>
                            <span className="metric-value">{geofencePlan.radiusMeters}m</span>
                        </div>
                        <div className="metric-row">
                            <span className="metric-label">Minimum Attestation Servers</span>
                            <span className="metric-value">{geofencePlan.attestationMin}</span>
                        </div>
                        <div className="metric-row">
                            <span className="metric-label">Business Hours Redemption Target</span>
                            <span className="metric-value">{geofencePlan.businessHoursTarget}%+</span>
                        </div>
                        <div className="metric-row">
                            <span className="metric-label">Current Business Hours</span>
                            <span className="metric-value">
                                {reputation.data ? `${reputation.data.pctRedemptionsInBusinessHours}%` : 'n/a'}
                            </span>
                        </div>
                        <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                            <button
                                onClick={() => router.push('/settings')}
                                style={{
                                    padding: '8px 10px',
                                    borderRadius: 8,
                                    border: '1px solid var(--border)',
                                    background: 'var(--mist)',
                                    fontSize: 12,
                                    fontWeight: 800,
                                }}
                            >
                                Open Settings
                            </button>
                            <button
                                onClick={() => router.push('/disputes')}
                                style={{
                                    padding: '8px 10px',
                                    borderRadius: 8,
                                    background: 'var(--gold-soft)',
                                    color: 'var(--gold)',
                                    fontSize: 12,
                                    fontWeight: 800,
                                }}
                            >
                                Review Risk Panel
                            </button>
                        </div>
                    </div>
                </div>

                <div className="section">
                    <div className="section-header">
                        <span className="section-title"><AlertTriangle size={14} /> Fraud Alerts</span>
                    </div>
                    {fraudAlerts.length > 0 ? (
                        <div className="scroll-card" style={{ padding: 'var(--s4)' }}>
                            {fraudAlerts.map((alert, index) => {
                                const severityClass = alert.severity === 'high'
                                    ? 'pill-crimson'
                                    : alert.severity === 'medium'
                                        ? 'pill-gold'
                                        : 'pill-jade';

                                return (
                                    <div
                                        key={alert.id}
                                        style={{
                                            paddingBottom: index === fraudAlerts.length - 1 ? 0 : 12,
                                            marginBottom: index === fraudAlerts.length - 1 ? 0 : 12,
                                            borderBottom: index === fraudAlerts.length - 1 ? 'none' : '1px solid var(--border)',
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                            <div style={{ fontSize: 14, fontWeight: 700 }}>{alert.title}</div>
                                            <span className={`pill ${severityClass}`}>{alert.severity}</span>
                                        </div>
                                        <div style={{ marginTop: 6, fontSize: 13, color: 'var(--text-2)' }}>{alert.detail}</div>
                                        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--gold)', fontWeight: 700 }}>
                                            Mitigation: {alert.mitigation}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="scroll-card" style={{ padding: 'var(--s4)' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} className="pill pill-jade">
                                <ShieldCheck size={12} /> No active fraud alerts
                            </div>
                            <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-2)' }}>
                                Keep attestation diversity high and monitor dispute queue daily.
                            </div>
                        </div>
                    )}
                </div>

                {blockers.length > 0 && (
                    <div className="section">
                        <div className="scroll-card" style={{ padding: 'var(--s4)', borderColor: 'var(--crimson-soft)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, color: 'var(--crimson)', fontWeight: 700 }}>
                                <AlertTriangle size={14} /> Critical Blockers
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
                                Resolve blockers before scaling campaign traffic. Recommended path:
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 8 }}>
                                1) Relayer health. 2) Merchant bond coverage. 3) Oracle freshness.
                            </div>
                        </div>
                    </div>
                )}

                <div className="section" style={{ marginBottom: 'var(--s8)' }}>
                    <div className="section-header">
                        <span className="section-title"><Clock3 size={14} /> Next 24h Plan</span>
                    </div>
                    <div className="scroll-card" style={{ padding: 'var(--s4)' }}>
                        <div className="metric-row"><span className="metric-label">1. Run live referral loop test</span></div>
                        <div className="metric-row"><span className="metric-label">2. Review funnel deltas in Oracle and apply one campaign preset</span></div>
                        <div className="metric-row"><span className="metric-label">3. Verify relayer + POS reliability under repeated scan load</span></div>
                    </div>
                </div>
            </div>
        </>
    );
}
