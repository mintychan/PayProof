# PayProof

**Privacy-preserving payroll streaming and proof-of-income attestations powered by Zama's fhEVM**

PayProof enables employers to stream encrypted salaries on-chain, employees to decrypt their earnings privately, and third-party verifiers to request income threshold proofs without ever learning the actual salary amounts. Built with fully homomorphic encryption (FHE) using Zama's fhEVM technology.

## 🎯 Overview

PayProof solves a critical privacy problem in blockchain-based payroll: how to prove income eligibility (for loans, rentals, etc.) without revealing your exact salary. Traditional blockchain transactions are public, making salary information visible to everyone. PayProof uses fully homomorphic encryption to keep salary data encrypted on-chain while still enabling:

- ✅ Real-time salary streaming with encrypted rates
- ✅ Private balance decryption for authorized parties only
- ✅ Zero-knowledge income threshold verification
- ✅ Tiered attestations (A/B/C) without revealing exact amounts

## 🏗️ Architecture

### Smart Contracts (Solidity + fhEVM)

**EncryptedPayroll.sol** - Core payroll streaming contract

- Creates encrypted salary streams with `euint64` rate per second
- Tracks encrypted balances using `euint128`
- Supports pause/resume functionality
- Stream lifecycle management (Active, Paused, Cancelled)
- Employer-controlled top-up capability
- Only employer and employee can decrypt amounts

**IncomeOracle.sol** - Privacy-preserving income attestations

- Accepts encrypted threshold from verifiers
- Computes encrypted income over lookback window
- Returns encrypted boolean (meets threshold?) and tier (A/B/C/None)
- Tiering: A (≥2× threshold), B (≥1.1× threshold), C (meets threshold)
- Verifiers decrypt attestation results without learning exact income

### Frontend (Next.js 14 + TypeScript)

**Three-persona architecture:**

- **`/employer`** - Create encrypted streams, view active streams, manage payroll
- **`/employee`** - View encrypted streams, decrypt salary amounts, generate proofs
- **`/verify`** - Submit encrypted thresholds, receive tiered attestations

**Tech Stack:**

- Next.js 14 with App Router
- Zama fhEVM Relayer SDK (`@zama-fhe/relayer-sdk`)
- Wagmi + Viem for wallet connectivity
- ethers.js for contract interactions
- TailwindCSS for styling

### Deployed Contracts (Sepolia)

- **EncryptedPayroll**: `0x409f3F0fC65Be37ED2592F52a4DC88c8Af240D2e`
- **IncomeOracle**: `0xE8C06A8a5fACC90C88D81FF0377b8510847C1717`

[View on Sepolia Etherscan](https://sepolia.etherscan.io/address/0x409f3F0fC65Be37ED2592F52a4DC88c8Af240D2e)

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- pnpm (recommended) or npm
- MetaMask or compatible Web3 wallet
- Sepolia testnet ETH

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd PayProof

# Install dependencies
pnpm install

# Set up environment variables
cp apps/web/.env.example apps/web/.env
cp contracts/.env.example contracts/.env

# Configure your .env files with:
# - NEXT_PUBLIC_SEPOLIA_RPC_URL
# - NEXT_PUBLIC_PAYPROOF_PAYROLL_CONTRACT
# - NEXT_PUBLIC_PAYPROOF_ORACLE_CONTRACT
# - Private keys for deployment (contracts/.env)
```

### Running Locally

```bash
# Start development server
pnpm dev

# Access at http://localhost:3000
```

### Testing

```bash
# Run contract tests (63 comprehensive tests)
cd contracts
npm test

# Run end-to-end tests (Playwright)
cd apps/web
npm run test:e2e
```

## 📖 User Flows

### 👔 Employer: Create Encrypted Stream

1. Connect wallet to Sepolia testnet
2. Navigate to `/employer`
3. Enter employee wallet address
4. Set stream rate (ETH per month)
5. Choose cadence (Monthly, Bi-weekly, Weekly)
6. Click "Encrypt & Create Stream"
7. Rate is encrypted client-side with fhEVM
8. Transaction creates on-chain stream with encrypted rate
9. View created streams in dashboard

### 👤 Employee: View & Decrypt Salary

1. Connect wallet to Sepolia testnet
2. Navigate to `/employee`
3. See list of active encrypted streams
4. Click on a stream to view details
5. Click "🔓 Decrypt Amount"
6. Sign EIP-712 message to authorize decryption
7. View decrypted salary rate (ETH/month)
8. Only you and employer can decrypt this amount

### 🔍 Verifier: Request Income Proof

1. Connect wallet to Sepolia testnet
2. Navigate to `/verify`
3. Enter employer wallet address
4. Set income threshold (ETH per month)
5. Set lookback window (days)
6. Click "Encrypt & Request Proof"
7. Threshold is encrypted client-side
8. Oracle performs encrypted computation
9. Receive encrypted attestation (meets + tier)
10. Click "🔓 Decrypt Result"
11. See threshold met status and tier (A/B/C)
12. Never learn the exact salary amount

### Privacy Guarantees

- Verifiers learn: ✅ Threshold met (yes/no) + Tier (A/B/C/None)
- Verifiers NEVER learn: ❌ Exact salary amount
- On-chain data: Only encrypted ciphertexts (handles)
- Decryption: Requires private key signature (employer/employee only)

## 🧪 Test Coverage

### Contract Tests (63 tests, 100% passing)

**EncryptedPayroll.sol** (34 tests)

- Stream creation and lifecycle
- Balance accrual over time
- Top-up functionality
- Pause/resume operations
- Balance tracking and queries
- Stream cancellation
- Edge cases (small/large rates, multiple streams)

**IncomeOracle.sol** (29 tests)

- Basic attestation flow
- Tier calculations (A/B/C/None)
- Lookback window variations (7/30/60/90 days)
- Edge cases and boundary conditions
- Multiple streams and attestations
- Privacy guarantees
- Integration with payroll contract
- Gas optimization

### Web Tests (13 Playwright tests)

- Employer flow: wallet connection, stream creation, encryption preview
- Employee flow: stream list, decryption, proof generation
- Verifier flow: attestation form, threshold encryption, tier decryption

**Note**: E2E tests currently skipped pending wallet/fhEVM mocking setup

## 🛠️ Technology Stack

### Blockchain

- **Solidity 0.8.24** - Smart contract language
- **fhEVM** - Fully homomorphic encryption for Ethereum
- **Hardhat** - Development environment
- **@fhevm/hardhat-plugin** - fhEVM testing and mocking
- **Sepolia Testnet** - Deployment network

### Frontend

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Wagmi** - React hooks for Ethereum
- **Viem** - TypeScript Ethereum library
- **Zama Relayer SDK** - Client-side FHE encryption/decryption
- **ethers.js** - Ethereum wallet implementation
- **TailwindCSS** - Styling

### Testing

- **Hardhat Test** - Solidity unit tests
- **Playwright** - End-to-end testing
- **Chai** - Assertion library

## 🗺️ Roadmap

### ✅ Phase 1: Core Functionality (Completed)

- [X] Encrypted payroll stream creation
- [X] Real-time balance accrual
- [X] Client-side encryption/decryption
- [X] Pause and resume streams
- [X] Privacy-preserving attestations
- [X] Tiered income verification
- [X] Comprehensive test coverage (63+ tests)
- [X] Sepolia deployment

### 🚧 Phase 2: Enhanced Features 

- [ ] **Employee withdrawal functionality**

  - Allow employees to withdraw accrued encrypted balance
  - Track withdrawn amounts separately from accrued
  - Emit `Withdrawal` event with encrypted amount
  - Update frontend to show available vs withdrawn balance
- [ ] **Stream top-up UI**

  - Employer dashboard for topping up existing streams
  - Show current stream balance before top-up
  - Visual confirmation of top-up success
  - Historical top-up tracking
- [ ] **Batch operations**

  - Create multiple streams in one transaction
  - Bulk pause/resume streams
  - Batch top-ups across multiple employees
- [ ] **Stream templates**

  - Save commonly used stream configurations
  - Quick-create streams from templates
  - Department-based default rates

### 🔮 Phase 3: Advanced Privacy Features 

- [ ] **Multi-stream aggregation**

  - Prove combined income from multiple employers
  - Encrypted sum of all active streams
  - Cross-employer attestations
- [ ] **Time-based proofs**

  - Prove income stability over time periods
  - Historical attestation archives
  - Trend analysis without revealing amounts
- [ ] **Conditional payouts**

  - Milestone-based encrypted releases
  - Performance-linked encrypted bonuses
  - Scheduled rate adjustments
- [ ] **Privacy-preserving analytics**

  - Encrypted aggregate statistics
  - Department-wide metrics without individual exposure
  - Compliance reporting with FHE

### 🌐 Phase 4: Ecosystem Integration 

- [ ] **DeFi integrations**

  - Use income attestations for undercollateralized loans
  - Yield farming with income-based tiers
  - Insurance products based on verified income
- [ ] **Multi-chain support**

  - Deploy to Ethereum mainnet with fhEVM
  - Cross-chain attestation verification
  - Bridge encrypted streams across chains
- [ ] **Verifier marketplace**

  - Decentralized verifier registry
  - Reputation system for attestation quality
  - Automated verification for common use cases (mortgages, rentals)
- [ ] **Mobile app**

  - React Native mobile wallet
  - Push notifications for stream events
  - Biometric decryption authorization

### 🔧 Phase 5: Developer Experience (Ongoing)

- [ ] **SDK and tooling**

  - JavaScript/TypeScript SDK for integration
  - CLI tools for stream management
  - Webhook notifications for events
- [ ] **Documentation**

  - Interactive tutorials
  - Integration guides
  - Video walkthroughs
- [ ] **Testing improvements**

  - E2E tests with wallet mocking
  - fhEVM integration test environment
  - Performance benchmarking suite

### 💡 Future Research

- Zero-knowledge proof integration for additional privacy layers
- Homomorphic encryption optimizations for gas reduction
- Privacy-preserving payroll tax calculations
- Encrypted employee benefits management

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

Built with [Zama&#39;s fhEVM](https://www.zama.ai/fhevm) - Fully Homomorphic Encryption for Ethereum

Submitted for the Zama Builder Track

---

**Disclaimer**: This is experimental software. Do not use in production without thorough security audits.
