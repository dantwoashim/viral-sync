# Viral Sync

Viral Sync is a decentralized loyalty and referral protocol on Solana.

Merchants launch token-based referral programs. Customers share and redeem rewards. Every share, claim, and redemption is tracked on-chain through Token-2022 transfer hooks.

## The Problem

Small and medium-sized businesses spend heavily on digital ads with weak attribution and low trust in reported ROI. Word-of-mouth converts well, but it is usually impossible to measure and reward reliably.

## How Viral Sync Works

1. Tracks token genealogy: Gen-1 (direct from merchant), Gen-2 (shared), Dead (no active attribution)
2. Attributes referrals on-chain through transfer hook execution
3. Pays commissions when redemptions occur
4. Computes viral metrics (K-factor, claim/redeem rates, conversion funnel)

All attribution and payout logic runs at the protocol layer.

## Architecture

See `ARCHITECTURE.md` for the full system design.

## On-Chain (Anchor / Rust)

- Transfer hook logic for attribution and balance classification
- Inbound ring buffer for spam-resilient processing
- Oracle metrics account for conversion analytics
- Merchant reputation and dispute workflows
- Session key support for gasless relayed actions

## Off-Chain

- Next.js dashboard and consumer mobile-first flows
- Gas relayer for sponsored transactions
- POS tools for QR/NFC redemption flows
- Crank scripts for maintenance and finalization

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contract | Rust, Anchor, Token-2022 |
| Frontend | Next.js, React, Recharts |
| Auth | Firebase Auth (Google) + demo fallback |
| Styling | Custom CSS design system |
| Relayer | Express.js, @solana/web3.js |
| Deployment | Vercel (frontend), Solana Devnet |

## Project Structure

```
viral-sync/
├── programs/viral_sync/src/     # Anchor smart contract
├── app/                         # Next.js merchant + consumer app
├── clients/                     # POS and web client helpers
├── relayer/                     # Gas sponsorship service
├── cranks/                      # On-chain maintenance scripts
├── tests/                       # Anchor integration tests
└── docs/                        # Supporting technical docs
```

## Getting Started

### Prerequisites

- Rust (1.75+)
- Solana CLI (1.18+)
- Anchor (0.30+)
- Node.js (18+)

### Build & Test Program

```bash
anchor build
anchor test
```

### Run Frontend

```bash
cd app
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Environment Variables

```bash
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_MERCHANT_PUBKEY=<merchant-wallet>
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_FIREBASE_API_KEY=<firebase-api-key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<project-id>.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<project-id>
NEXT_PUBLIC_FIREBASE_APP_ID=<firebase-app-id>
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<project-id>.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<sender-id>
```

## Live Demo

- Dashboard: [https://viral-sync.vercel.app](https://viral-sync.vercel.app)

## License

MIT
