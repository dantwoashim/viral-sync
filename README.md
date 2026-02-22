# Viral Sync

A decentralized loyalty and referral protocol on Solana that turns word-of-mouth into measurable, on-chain growth.

Merchants launch token-based referral programs. Customers earn and share tokens. Every share, claim, and redemption is tracked on-chain through Token-2022 Transfer Hooks — no centralized server, no trust required.

## The Problem

Small and medium-sized businesses spend thousands on digital advertising with no way to verify ROI. Meanwhile, the most powerful marketing channel — word-of-mouth — is completely unmeasurable and unrewardable.

Google Ads costs ~$2-5 per click with unclear conversion. A friend's recommendation converts at 4-10x higher rates, but the friend gets nothing.

## How Viral Sync Solves It

Every merchant gets a custom Token-2022 token. When customers hold and share these tokens, the Solana blockchain automatically:

1. **Tracks token genealogy** — Gen-1 (direct from merchant), Gen-2 (shared by referrer), Dead (lost attribution)
2. **Attributes referrals** — The Transfer Hook intercepts every transfer and records who referred whom
3. **Pays commissions** — When someone redeems at the store, their referrer automatically earns commission
4. **Measures virality** — The on-chain Viral Oracle computes K-Factor, conversion funnels, and cost-per-customer

All of this happens at the protocol level. No app, no database, no middleman.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Solana Program                     │
│                                                       │
│  Transfer Hook ──→ Token Genealogy ──→ Commissions   │
│       ↓                  ↓                  ↓        │
│  Inbound Buffer    Referral Records    Commission    │
│  (16-slot ring)    (4 slots/user)      Ledger        │
│       ↓                                              │
│  Finalize (crank)  ←── Viral Oracle ←── Reputation   │
└─────────────────────────────────────────────────────┘
        ↑                    ↑                  ↑
   Next.js App          Gas Relayer         NFC / POS
  (Merchant UI)       (Gasless UX)        (Tap to Pay)
```

### On-Chain (Anchor / Rust)

- **19 instructions** across 6 phases: initialization, transfers, redemption, escrows, oracles, disputes
- **Transfer Hook** — fires on every `transfer_checked`, classifies token generation, enforces FIFO consumption
- **Inbound Ring Buffer** — 16-slot circular buffer prevents DoS spam attacks on popular accounts
- **Viral Oracle** — on-chain analytics: K-Factor, conversion rates, efficiency vs Google Ads
- **Merchant Reputation** — suspicion scoring, business-hours validation, attestation tracking
- **Dispute Resolution** — watchdog staking, timeout-based arbitration, bond slashing
- **Session Keys** — delegated signing for gasless POS transactions

### Off-Chain

- **Next.js Dashboard** — merchant analytics, referral management, settings
- **Consumer PWA** — scan/share referrals, check rewards, redeem at store
- **Gas Relayer** — Express.js server that sponsors transactions so users never touch SOL
- **NFC Client** — generates daily-rotating authentication payloads for physical POS hardware
- **Crank Scripts** — automated finalization, cleanup, and oracle computation

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contract | Rust, Anchor Framework, Token-2022 Extensions |
| Transfer Hook | Solana Token Extensions (transfer_hook) |
| Frontend | Next.js 16, React, Framer Motion, Recharts |
| Auth | Privy (embedded Solana wallets, social login) |
| Styling | Custom CSS design system (dark mode) |
| Relayer | Express.js, @solana/web3.js |
| POS | NFC payload generation, session key delegation |
| Deployment | Vercel (frontend), Solana Devnet (program) |

## Token Extensions Used

- **Transfer Hook** — core mechanic: intercepts every transfer to track genealogy
- **Transfer Fee** — configurable merchant fee on token transfers
- **Token Metadata** — on-chain name, symbol, URI for each merchant's token

## Key Design Decisions

**FIFO Token Consumption** — Gen-1 tokens are consumed before Gen-2 before Dead. This maximizes viral propagation: sharing your "best" tokens first creates the most referral chains downstream.

**Ring Buffer for DoS Protection** — Instead of failing on spam, the buffer marks overflow tokens as Dead. Transfers always succeed; only attribution is lost. Spammers hurt themselves, not recipients.

**4-Slot Referrer Cap** — Each user tracks at most 4 active referrers. This bounds compute cost at redemption and keeps commission calculation predictable.

**Session Keys** — Users can delegate transaction signing to a relayer for a limited time window. This means NFC tap-to-pay at a physical store with zero crypto UX.

## Project Structure

```
viral-sync/
├── programs/viral_sync/src/     # Anchor smart contract
│   ├── instructions/            # 19 instruction handlers
│   ├── state/                   # Account structs (PDAs)
│   └── lib.rs                   # Program entrypoint
├── app/                         # Next.js merchant dashboard + consumer app
│   └── src/
│       ├── app/                 # Pages (dashboard, oracle, network, login, POS)
│       ├── components/          # Sidebar, shell, UI components
│       └── lib/                 # Auth, hooks, Solana utilities
├── clients/
│   ├── pos/                     # NFC point-of-sale client
│   └── web/                     # Consumer web client components
├── relayer/                     # Express.js gas sponsorship server
├── cranks/                      # Automated on-chain maintenance scripts
├── tests/                       # Anchor integration tests
├── docs/                        # Architecture documentation
└── deploy.sh                    # Devnet deployment script
```

## Getting Started

### Prerequisites

- [Rust](https://rustup.rs/) (1.75+)
- [Solana CLI](https://docs.solanalabs.com/cli/install) (1.18+)
- [Anchor](https://www.anchor-lang.com/docs/installation) (0.30+)
- [Node.js](https://nodejs.org/) (18+)

### Build & Deploy the Program

```bash
# Install dependencies
anchor build

# Deploy to devnet
solana config set --url devnet
anchor deploy

# Run tests
anchor test
```

### Run the Dashboard

```bash
cd app
npm install
cp .env.example .env.local   # Configure your env vars
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Environment Variables

```
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_MERCHANT_PUBKEY=<your-merchant-wallet>
NEXT_PUBLIC_PRIVY_APP_ID=<your-privy-app-id>
```

## Screenshots

### Merchant Dashboard
The overview page shows real-time on-chain stats: token supply, K-Factor virality score, commission rates, and reputation scoring — all pulled directly from Solana PDAs.

### Viral Oracle
The Oracle page visualizes the viral coefficient (K-Factor), conversion funnel (Share → Claim → Redeem), and efficiency comparison against traditional advertising.

### Consumer Experience
Mobile-first consumer flow: scan a referral link, claim tokens, share with friends, redeem at the store via NFC tap.

## How It Works (User Flow)

1. **Merchant** deploys a token, configures commission rates, and funds a bond
2. **Merchant** issues tokens to early customers
3. **Customer A** shares tokens to **Customer B** via referral link
4. The **Transfer Hook** fires: classifies tokens as Gen-2, buffers the inbound transfer
5. A **crank** finalizes the buffer and writes the referral record
6. **Customer B** redeems tokens at the store (NFC tap or QR scan)
7. The **redemption instruction** credits **Customer A**'s commission ledger
8. The **Viral Oracle** recomputes the K-Factor with the new data point

## Live Demo

- **Dashboard**: [https://viral-sync.vercel.app](https://viral-sync.vercel.app)
- **Program (Devnet)**: Deployed via Anchor CLI

## Team

- **Prabin Ghimire** — Full-stack developer, Solana/Anchor

## License

MIT
