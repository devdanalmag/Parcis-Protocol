<p align="center">
  <img src="public/logo.png" alt="Parcis Logo" width="120" />
</p>

<h1 align="center">Parcis Protocol</h1>

<p align="center">
  <strong>Decentralized Commerce, Trustless Escrow & Streaming Protocol for Arc Network</strong>
</p>

<p align="center">
  <a href="https://parcis.app">Website</a> •
  <a href="#deployed-contracts">Deployed Contracts</a> •
  <a href="#quickstart">Quickstart</a> •
  <a href="#parcis-sdk">Developer SDK</a> •
  <a href="#environment-configuration">Environment Config</a>
</p>

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Network Support & Parameters](#network-support--parameters)
- [Deployed Contracts](#deployed-contracts)
- [Protocol Architecture](#protocol-architecture)
- [Project Structure](#project-structure)
- [Quickstart](#quickstart)
- [Environment Configuration](#environment-configuration)
- [Hardhat Management Scripts](#hardhat-management-scripts)
- [Parcis Web3 SDK](#parcis-sdk)
- [Revenue & Fee Model](#revenue--fee-model)
- [Cross-Chain Transfers (Circle CCTP)](#cross-chain-transfers-circle-cctp)
- [License](#license)

---

## Overview

**Parcis** is a 100% decentralized Web3 commerce and financial tooling protocol built natively for **Arc Network**. It provides high-speed, gas-efficient on-chain payments, escrow protection, continuous streaming subscriptions, and developer registry infrastructure using native USDC.

There is **no centralized database** — the Arc blockchain acts as the single source of truth for payment links, escrow states, per-second streaming rates, and developer reputation.

---

## Key Features

- 🔗 **Shareable Payment Links (Parcis Links V3)**
  - Fixed, Open/Tip, Group Split, and Subscription Links.
  - Custom branded vanity slugs (e.g., `parcis.app/#/pay/my-brand`).
  - Automatic on-chain QR code generation for payments.
  - Gasless link creation supported via meta-transaction sponsorship.

- 🛡️ **Trustless Escrow (Parcis Safe)**
  - 8-state deal lifecycle: `Created` → `Funded` → `Submitted` → `Completed` / `Disputed` → `Resolved` → `Appealed` → `Finalized`.
  - On-chain proof of deliverable verification.
  - Decentralized Platform Arbiter Pool with weighted trust scores.
  - 24-hour dispute appeal window with governance-backed arbiter slashing.

- ⚡ **Continuous Money Streaming (Parcis Streams)**
  - Per-second micro-streaming for subscriptions, payroll, and SaaS pricing.
  - Real-time accrued USDC withdrawal at any moment.
  - Instant cancelation with fair, pro-rata refund of remaining balance.

- 💻 **Decentralized Developer Console & SDK**
  - Developer identity, on-chain API key hashing, and webhook registries.
  - Direct TypeScript/JavaScript client (`ParcisClient.js`) for backend commerce & dApps.

- 👛 **Reown AppKit (WalletConnect v2)**
  - Native multi-wallet connector supporting MetaMask, Coinbase Wallet, Rabby, Rainbow, and social log-ins.

---

## Network Support & Parameters

Parcis operates across both **Arc Mainnet** and **Arc Testnet**:

| Parameter | Arc Mainnet (Production) | Arc Testnet |
|:---|:---|:---|
| **Chain ID** | `5042` | `5042002` |
| **RPC Endpoint** | `https://rpc.mainnet.arc.io` | `https://arc-testnet.drpc.org` |
| **Block Explorer** | [explorer.arc.io](https://explorer.arc.io) | [testnet.arcscan.app](https://testnet.arcscan.app) |
| **Native Currency** | USDC (18 decimals) | USDC (18 decimals) |
| **Native USDC Address** | `0x3600000000000000000000000000000000000000` | `0x3600000000000000000000000000000000000000` |

---

## Deployed Contracts

All core contracts are deployed as **UUPS Upgradeable Proxies** using OpenZeppelin standards:

### Arc Mainnet (Chain ID: `5042`)

| Contract | Type | Proxy Address |
|:---|:---|:---|
| **ParcisLinksV3** | Payment Links & Vanity Slugs | [`0xddB356b2cDd210C717dDc6ACCB50e4825dC290e0`](https://explorer.arc.io/address/0xddB356b2cDd210C717dDc6ACCB50e4825dC290e0) |
| **ParcisSafe** | Escrow, Disputes & Appeals | [`0x7BD84F1EDA677c98217F590560E8C0577Efba809`](https://explorer.arc.io/address/0x7BD84F1EDA677c98217F590560E8C0577Efba809) |
| **ParcisStreams** | Continuous USDC Subscriptions | [`0xe6775F130F61d9d2e3E93Dad2e6d971788D36557`](https://explorer.arc.io/address/0xe6775F130F61d9d2e3E93Dad2e6d971788D36557) |
| **ParcisDevRegistry** | Developer Identity & Webhooks | [`0x553f697C3a72e91A4cBa16D807DB5015275B0Cc1`](https://explorer.arc.io/address/0x553f697C3a72e91A4cBa16D807DB5015275B0Cc1) |

### Arc Testnet (Chain ID: `5042002`)

| Contract | Type | Proxy Address |
|:---|:---|:---|
| **ParcisLinksV3** | Payment Links & Vanity Slugs | [`0xed01BBEcadF908Dc7a2B8f8D66d519eE2DA11c94`](https://testnet.arcscan.app/address/0xed01BBEcadF908Dc7a2B8f8D66d519eE2DA11c94) |
| **ParcisSafe** | Escrow, Disputes & Appeals | [`0x462b674d2feD79CD38e813eb5455e3DCf27D0077`](https://testnet.arcscan.app/address/0x462b674d2feD79CD38e813eb5455e3DCf27D0077) |
| **ParcisStreams** | Continuous USDC Subscriptions | [`0x2dba83814b30e42C0a25E63c331C10A4E0766c3d`](https://testnet.arcscan.app/address/0x2dba83814b30e42C0a25E63c331C10A4E0766c3d) |
| **ParcisDevRegistry** | Developer Identity & Webhooks | [`0xB84CDFe9dd3057Fd820fe56BAC52906a4B42C670`](https://testnet.arcscan.app/address/0xB84CDFe9dd3057Fd820fe56BAC52906a4B42C670) |

---

## Protocol Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                          USER BROWSER / CLIENT                         │
│                                                                        │
│   Single Page App (Vite) ──► Reown AppKit / Wagmi v2 / Viem            │
│       ├── src/main.js           (Routing & State Machine)              │
│       ├── src/pages.js          (DOM Views & UI Components)            │
│       ├── src/wallet.js         (Dynamic Multi-Chain Connector)        │
│       ├── src/config.js         (Unified Network Resolver)             │
│       ├── src/contract.js       (Escrow & Streams Client)              │
│       └── src/sdk/              (Programmatic Web3 SDK)                │
└───────────────────┬───────────────────────────────┬────────────────────┘
                    │                               │
            Direct JSON-RPC                  Vercel Serverless
                    │                     (Gas Sponsorship Relayer)
                    ▼                               ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        ARC BLOCKCHAIN (5042)                           │
│                                                                        │
│   ┌───────────────────────┐             ┌──────────────────────────┐   │
│   │   ParcisLinksV3.sol   │             │      ParcisSafe.sol      │   │
│   │ (Vanity URLs & Links) │             │ (Escrow, Arbiter & Slash)│   │
│   └───────────────────────┘             └──────────────────────────┘   │
│   ┌───────────────────────┐             ┌──────────────────────────┐   │
│   │   ParcisStreams.sol   │             │   ParcisDevRegistry.sol  │   │
│   │  (Streaming Subscriptions)          │  (API Auth & Rate Limits)│   │
│   └───────────────────────┘             └──────────────────────────┘   │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                Native USDC Token (0x3600...0000)               │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
Arc/
├── contracts/               # Solidity smart contracts
│   ├── ParcisLinksV3.sol    #   UUPS payment links & premium vanity URLs
│   ├── ArcSafe.sol          #   Trustless escrow & arbiter governance
│   ├── ParcisStreams.sol    #   Continuous payment streaming
│   └── ParcisDevRegistry.sol#   Developer console on-chain registry
├── src/                     # Frontend client source
│   ├── config.js            #   Unified dynamic network resolver
│   ├── wallet.js            #   Wagmi v2 / Viem connection & balance manager
│   ├── reown.js             #   Reown AppKit configuration & modal
│   ├── pages.js             #   UI page templates (Pay, Safe, Dashboard, Admin)
│   ├── main.js              #   Router & DOM event orchestration
│   ├── contract.js          #   Escrow & streaming contract calls
│   ├── links-contract.js    #   Payment link contract calls
│   ├── devAuth.js           #   EIP-712 developer authentication
│   └── sdk/                 #   Parcis Programmatic Web3 SDK
│       ├── ParcisClient.js  #     Direct Viem Web3 SDK client
│       └── index.d.ts       #     Full TypeScript declarations
├── api/                     # Serverless backend functions (Vercel)
│   ├── _shared.js           #   Backend network & contract resolver
│   ├── sponsor-link.js      #   Gas sponsorship relayer endpoint
│   └── score.js             #   On-chain reputation & trust score API
├── scripts/                 # Hardhat deployment & upgrade utilities
│   ├── deploy-all-upgrades.cjs # Deploy/upgrade all 4 proxies
│   ├── manage-roles.mjs     # Inspect & grant contract ownership/roles
│   └── check-version.cjs    # Verify on-chain contract versions
├── .env.example             # Complete dual-network configuration template
├── .env.mainnet.example     # Standalone Arc Mainnet configuration template
└── vite.config.js           # Vite dev server with dynamic RPC proxy
```

---

## Quickstart

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** or **pnpm**
- Modern Web3 wallet (MetaMask, Rabby, Phantom, Coinbase Wallet)

### 2. Installation
```bash
git clone https://github.com/devdanalmag/payarc.git
cd payarc
npm install
```

### 3. Setup Environment
Copy the example environment template:
```bash
cp .env.example .env
```

To run on **Arc Mainnet**, set:
```env
VITE_NETWORK=mainnet
NETWORK=mainnet
```

To run on **Arc Testnet**, set:
```env
VITE_NETWORK=testnet
NETWORK=testnet
```

### 4. Start Development Server
```bash
npm run dev
```
Open **`http://localhost:3000`** in your browser.

### 5. Build for Production
```bash
npm run build
```

---

## Environment Configuration

Parcis uses a unified dual-network configuration pattern. You can switch between **Arc Mainnet** and **Arc Testnet** instantly by changing `VITE_NETWORK`:

```env
# ── Active Network Selector ("mainnet" or "testnet") ──
VITE_NETWORK=mainnet
NETWORK=mainnet

# ── Arc Mainnet (Chain ID: 5042) ──
VITE_MAINNET_CHAIN_ID=5042
VITE_MAINNET_RPC_URL=https://rpc.mainnet.arc.io
VITE_MAINNET_EXPLORER=https://explorer.arc.io
VITE_MAINNET_USDC_ADDRESS=0x3600000000000000000000000000000000000000
VITE_MAINNET_LINKS_CONTRACT=0xddB356b2cDd210C717dDc6ACCB50e4825dC290e0
VITE_MAINNET_ARCSAFE_CONTRACT=0x7BD84F1EDA677c98217F590560E8C0577Efba809
VITE_MAINNET_STREAMS_CONTRACT=0xe6775F130F61d9d2e3E93Dad2e6d971788D36557
VITE_MAINNET_DEV_REGISTRY_CONTRACT=0x553f697C3a72e91A4cBa16D807DB5015275B0Cc1

# ── Arc Testnet (Chain ID: 5042002) ──
VITE_TESTNET_CHAIN_ID=5042002
VITE_TESTNET_RPC_URL=https://arc-testnet.drpc.org
VITE_TESTNET_EXPLORER=https://testnet.arcscan.app
VITE_TESTNET_USDC_ADDRESS=0x3600000000000000000000000000000000000000
VITE_TESTNET_LINKS_CONTRACT=0xed01BBEcadF908Dc7a2B8f8D66d519eE2DA11c94
VITE_TESTNET_ARCSAFE_CONTRACT=0x462b674d2feD79CD38e813eb5455e3DCf27D0077
VITE_TESTNET_STREAMS_CONTRACT=0x2dba83814b30e42C0a25E63c331C10A4E0766c3d
VITE_TESTNET_DEV_REGISTRY_CONTRACT=0xB84CDFe9dd3057Fd820fe56BAC52906a4B42C670

# ── WalletConnect & Platform Settings ──
VITE_REOWN_PROJECT_ID=your_reown_project_id
VITE_PREMIUM_SLUG_FEE=0.5
VITE_MIN_ARBITER_STAKE=10
VITE_ADMIN_ROUTE_PATH=parcis-ops-9842x
```

---

## Hardhat Management Scripts

The `scripts/` directory contains tools for verifying and managing on-chain proxies:

```bash
# Check version numbers across all deployed proxies
node scripts/check-version.cjs

# Verify on-chain contract ownership and role distribution
node scripts/check-ownership-viem.mjs

# Inspect or manage contract roles (Admin, Sponsor, Arbiter)
node scripts/manage-roles.mjs

# Deploy or upgrade all 4 UUPS proxies on Arc Mainnet
npx hardhat run scripts/deploy-all-upgrades.cjs --network arcMainnet

# Deploy or upgrade all 4 UUPS proxies on Arc Testnet
npx hardhat run scripts/deploy-all-upgrades.cjs --network arcTestnet
```

---

## Parcis Web3 SDK

Parcis includes a standalone Programmatic Web3 client (`ParcisClient.js`) with full TypeScript support:

```javascript
import { ParcisClient } from './src/sdk/ParcisClient.js';

// Initialize for Arc Mainnet (or pass { network: 'testnet' })
const client = new ParcisClient({
  network: 'mainnet',
  walletClient: customWalletClient, // optional for read operations
});

// 1. Pay a payment link
const receipt = await client.payLink('my-store', 50.00);
console.log('Payment confirmed in tx:', receipt.hash);

// 2. Start a continuous streaming subscription
const stream = await client.startStream({
  recipient: '0xRecipientAddress...',
  amount: 100, // 100 USDC total
  durationDays: 30, // streamed over 30 days
});

// 3. Query on-chain trust score and reputation
const score = await client.getTrustScore('0xUserAddress...');
console.log(`Trust Score: ${score.trustScore}/100 (${score.level})`);
```

---

## Revenue & Fee Model

1. **Custom Vanity Link Fee ($0.50 USDC)**:
   - When users register a custom branded slug (e.g., `parcis.app/#/pay/shop`), an atomic **$0.50 USDC** fee is transferred directly to the protocol `platformWallet`.
   - Free random-slug links remain completely free with zero platform fee.
2. **Escrow Dispute & Resolution Fee (0.50%)**:
   - Split equally between the protocol `platformWallet` (0.25%) and the resolving arbiter (0.25%) upon deal completion.
3. **Streaming Fee (0.25%)**:
   - A 0.25% protocol fee is deducted upon stream withdrawal.
4. **Governance Configurable**:
   - `platformWallet`, minimum arbiter stakes, and slug fees are configurable on-chain via the Admin Panel (`#/parcis-ops-9842x`).

---

## Cross-Chain Transfers (Circle CCTP)

Native USDC 1:1 cross-chain bridging via Circle CCTP (enabling direct payments to Arc from Base, Arbitrum, Ethereum, and Solana) is integrated in [`src/cctp.js`](file:///c:/xampp/htdocs/Arc/src/cctp.js).

> [!NOTE]
> Circle CCTP bridging is currently marked as **Coming Soon** in the frontend while multi-chain bridge routes complete final mainnet validation.

---

## License

MIT License. Open source and built for the Arc Network ecosystem.
