# PayProof — Confidential Payroll Streams & Proof-of-Income (PoI) Oracle

**Frontend:** React + Next.js • **Smart contracts:** FHEVM Solidity • **Target:** Zama Builder Track submission

---

## 1) Summary

**PayProof** lets employers stream payroll **privately** on-chain while issuing **threshold-style Proof-of-Income attestations** (e.g., “30-day income ≥ A$4,000”) to lenders, BNPLs, or rental agents—without ever revealing exact salaries. Built on Zama’s **FHEVM** so all sensitive state (rates, balances) remains **encrypted** on-chain; users encrypt before sending and decrypt locally. The MVP ships a working dApp + contracts on Zama’s **Protocol public testnet** or via the **fhEVM Coprocessor** on Sepolia. ([Zama](https://www.zama.ai/post/announcing-the-zama-confidential-blockchain-protocol?utm_source=chatgpt.com "Announcing Our Series B and the Zama Confidential Blockchain Protocol"))

---

## 2) Goals & Non-Goals

### Goals

* Employers create, fund, and manage **confidential payroll streams** (amounts encrypted end-to-end). ([Zama](https://www.zama.ai/post/announcing-the-zama-confidential-blockchain-protocol?utm_source=chatgpt.com "Announcing Our Series B and the Zama Confidential Blockchain Protocol"))
* Employees view **decryptable payslips** locally (current period + YTD) and export a minimal proof artifact. ([docs.zama.ai](https://docs.zama.ai/protocol/solidity-guides/v0.7?utm_source=chatgpt.com "Overview | Protocol - docs.zama.ai"))
* Verifiers request **PoI** by submitting an encrypted threshold; the contract returns **boolean/tier** + an attestation reference—no raw salary disclosed. ([docs.zama.ai](https://docs.zama.ai/protocol/solidity-guides/v0.7?utm_source=chatgpt.com "Overview | Protocol - docs.zama.ai"))

### Non-Goals (MVP)

* Full tax/benefits engine, fiat rails, or multi-jurisdiction payroll compliance.

---

## 3) Users & Primary Jobs

* **Employer / DAO treasurer** — set up/fund private salary streams; pause/cancel; export audit trail.
* **Employee** — decrypt personal payslip; optionally share PoI attestation.
* **Verifier (lender/BNPL/agent)** — request a **threshold proof** and verify the attestation with an on-chain reference.

---

## 4) Core Flows (MVP)

1. **Create Confidential Stream (Employer)**

   Inputs (employee address, cadence, start date, rate) are **encrypted client-side** → stored/updated as ciphertext on-chain.
2. **View Payslip (Employee)**

   Frontend fetches encrypted state → **local decrypt** → render period earnings & YTD; never persists plaintext.
3. **Request PoI (Verifier)**

   Verifier submits **encrypted threshold** → contract computes `(encIncome ≥ encThreshold)` and returns **Yes/No** (and optional Tier A/B/C) +  **attestation JSON + event** .

*Why this works:* Zama’s FHEVM provides encrypted types & operations in Solidity, plus guides for inputs, ACL, and decryption flows. ([docs.zama.ai](https://docs.zama.ai/protocol/solidity-guides/v0.7?utm_source=chatgpt.com "Overview | Protocol - docs.zama.ai"))

---

## 5) Competitive Context (why streaming + confidentiality)

On-chain **streaming payroll** (e.g., Sablier) is proven useful, but amounts are public; PayProof adds **confidential amounts** and  **programmable PoI** , keeping composability. This is the wedge vs web2 verifiers that require raw payslips/bank data. ([docs.sablier.com](https://docs.sablier.com/concepts/streaming?utm_source=chatgpt.com "Streaming | Sablier Docs"))

---

## 6) Product Requirements

### 6.1 Functional

* **Encrypted state & compute:** All sensitive values (rates, balances, income totals) are ciphertext; comparisons and additions happen **over encrypted types** (FHEVM). ([docs.zama.ai](https://docs.zama.ai/protocol/solidity-guides/v0.7?utm_source=chatgpt.com "Overview | Protocol - docs.zama.ai"))
* **Threshold attestations:** Contract exposes `attestMonthlyIncome(encThreshold, lookbackDays)` returning `{ meets: bool, tier?: A|B|C }` + an  **on-chain Attested event** .
* **Client-side crypto:** Inputs encrypted before submission; employees decrypt views locally (end-to-end model). ([6min.zama.ai](https://6min.zama.ai/?utm_source=chatgpt.com "Fully Homomorphic Encryption (FHE) explained - Zama"))
* **Deploy targets:** Zama **Protocol public testnet** or **fhEVM Coprocessor** (Sepolia) so the demo is accessible to reviewers. ([Zama](https://www.zama.ai/post/announcing-the-zama-confidential-blockchain-protocol?utm_source=chatgpt.com "Announcing Our Series B and the Zama Confidential Blockchain Protocol"))
* **Access control:** Employers manage their streams; employees decrypt their own balances; verifiers only receive threshold results + attestations—never raw values.

### 6.2 Non-Functional

* **Latency guidance:** tx finality under typical testnet conditions; decrypt view < 300ms on mid-range laptop.
* **Security:** No plaintext salary in logs/events/storage; strict CSP & redacted error logs.
* **DX:** One-command local dev; seeded accounts; `.env.example`; GitHub Actions CI.

### 6.3 Testing & Verification

* **Contracts:** Hardhat unit tests cover stream lifecycle (create/top-up/pause) and PoI threshold outcomes; run via `pnpm test:contracts` on every PR.
* **Frontend:** Playwright smoke tests validate `/employer`, `/employee`, and `/verify` happy paths with seeded accounts; headless runs in CI.
* **CI gating:** Type check, lint, and automated tests must pass before merge; failures block release candidates.

---

## 7) Architecture

### 7.1 Smart Contracts (FHEVM Solidity)

* **`EncryptedPayroll.sol`**
  * `createStream(employee, encRate, cadence, start)`
  * `topUp(encAmount)`
  * `pauseStream()/cancelStream()`
  * `encryptedBalanceOf(employee)` → ciphertext (authorized views only)
* **`IncomeOracle.sol`**
  * `attestMonthlyIncome(encThreshold, lookbackDays)` → `{ meets, tier? }` and `Attested(employee, lookback, meets, tier?, attestationIdHash)`

**Implementation notes:**

* Configure FHE library & oracle/relayer addresses per **Solidity Guides v0.7** (configuration helpers provided by the `fhevm` package). ([docs.zama.ai](https://docs.zama.ai/protocol/solidity-guides/v0.7/smart-contract/configure?utm_source=chatgpt.com "Configuration | Protocol - docs.zama.ai"))
* If choosing the **Coprocessor** route, point the contracts & client to Sepolia coprocessor endpoints (per Zama’s post). ([Zama](https://www.zama.ai/post/fhevm-coprocessor?utm_source=chatgpt.com "Introducing the fhEVM Coprocessor: Run FHE smart contracts on Ethereum ..."))

### 7.2 Frontend (React + Next.js)

* **Stack:** Next.js (App Router), TypeScript, wagmi + viem, React Query, Tailwind.
* **Crypto client:** FHEVM client utils (encrypt before write; decrypt after read).
* **Pages & Components**
  * `/employer` — **Create/Manage Stream** (form → client-encrypt → tx); `PayrollStreamForm.tsx`
  * `/employee` — **Payslip** (fetch ciphertext → decrypt → render); `PayslipCard.tsx`
  * `/verify` — **PoI Request** (enter threshold → receive result + attestation); `PoIAttestationPanel.tsx`
  * Shared: `CipherBadge.tsx` (UI affordance: “Encrypted on-chain”), `NetworkStatus.tsx`

### 7.3 Optional Services

* **Read-only indexer** for non-sensitive metadata (stream counts, last update block).
* **Webhook** for verifier callbacks (never handle plaintext salary).

---

## 8) Data Model (conceptual)

* **Stream** `{ employer, employee, encRate, cadence, start, status }`
* **EncState** `{ employee, encAccrued, updatedAt }`
* **PoI Request** `{ verifier, employee, encThreshold, window, nonce }`
* **PoI Result** `{ meets: bool, tier: A|B|C, attestationId, block }`

  All sensitive fields are **ciphertext** on-chain; decrypted values live only in ephemeral client memory.

---

## 9) UX Details

### Employer

* Guided form with **“Encryption ready”** check and network selector (Protocol testnet / Sepolia Coprocessor).
* Success state shows **tx hash + stream ID** (never the amount).

### Employee

* Payslip shows  **Period** ,  **YTD** ,  **Stream status** , and **Export Proof** (PDF containing attestation pointer + explainer, no salary).

### Verifier

* Minimal flow: **Enter threshold → Get proof** (Yes/No + optional tier) with an **on-chain reference** and a copy-paste verify snippet.

---

## 10) Privacy, Security & Compliance

* **End-to-end confidentiality** : inputs encrypted client-side; encrypted state & compute on-chain; decryption only by authorized parties. ([6min.zama.ai](https://6min.zama.ai/?utm_source=chatgpt.com "Fully Homomorphic Encryption (FHE) explained - Zama"))
* **Data minimization** : attestations reveal only the **signal** (threshold result), reducing data liability for verifiers.
* **PII handling** : only wallet addresses on-chain; avoid storing names/emails; redact analytics.

---

## 11) Milestones (4-week Builder Track plan)

* **W1 — Contracts & Env** : Repo scaffold (pnpm workspaces + Hardhat), FHEVM configuration, baseline `createStream`/`encryptedBalanceOf` logic with passing `pnpm test:contracts` suite wired into CI. ([docs.zama.ai](https://docs.zama.ai/protocol/solidity-guides/v0.7?utm_source=chatgpt.com "Overview | Protocol - docs.zama.ai"))
* **W2 — Next.js UI** : Employer & Employee pages; client-side encrypt/decrypt; seed script & demo accounts; add Playwright smoke tests for payslip decrypt flow.
* **W3 — PoI Oracle** : Implement `attestMonthlyIncome`; emit `Attested`; `/verify` flow + verify snippet; extend tests to cover threshold tiers and event assertions.
* **W4 — Deploy & Submit** : Ship to **Protocol testnet** or  **Sepolia (Coprocessor)** ; capture block explorer links for payroll + attestation txs; record a 3-min demo; update README with reproduction steps; submit per  **Developer Program FAQ** . ([docs.zama.ai](https://docs.zama.ai/programs/developer-program/frequently-asked-questions.md?utm_source=chatgpt.com "docs.zama.ai"))

---

## 12) Acceptance Criteria (MVP)

* ✅ Employer can create & fund a **confidential** stream; chain observers cannot infer amounts.
* ✅ Employee decrypts and views **Period + YTD** locally.
* ✅ Verifier submits an **encrypted threshold** and receives **boolean/tier** + attestation + on-chain event reference.
* ✅ Automated contract + UI tests run green in CI, with documented commands (`pnpm test:contracts`, `pnpm test:e2e`).
* ✅ Deployed on Zama **Protocol testnet** or via **fhEVM Coprocessor** on Sepolia; README lists demo URL, wallet roles, and block explorer links; repo includes README & demo video. ([Zama](https://www.zama.ai/post/announcing-the-zama-confidential-blockchain-protocol?utm_source=chatgpt.com "Announcing Our Series B and the Zama Confidential Blockchain Protocol"))

---

## 13) Risks & Mitigations

* **Homomorphic compute cost/latency:** Start with **simple arithmetic & comparisons** (threshold checks) and keep proofs minimal; document perf expectations. (FHEVM adds larger encrypted types & the Coprocessor path for broader EVM reach.) ([Zama](https://www.zama.ai/post/fhevm-v0-6?utm_source=chatgpt.com "fhEVM v0.6: Enhanced Input Mechanism with Proof Capabilities, Expanded ..."))
* **Dev complexity / setup drift:** Follow Zama **Solidity Guides v0.7** (Quick Start, config helpers) and pin versions; provide a one-click script. ([docs.zama.ai](https://docs.zama.ai/protocol/solidity-guides/v0.7?utm_source=chatgpt.com "Overview | Protocol - docs.zama.ai"))
* **Network availability:** If Sepolia Coprocessor experiences downtime, fall back to the  **Protocol public testnet** , and keep a local dev chain. ([Zama community forum and support](https://community.zama.ai/t/availability-on-sepolia/1643?utm_source=chatgpt.com "Availability on Sepolia - Zama Protocol ｜ FHEVM - Zama community forum ..."))

---

## 14) Metrics (demo & early product)

* **Demo KPIs:** Time-to-first-decrypt < 2 min; PoI round-trip < 20s p95; 3 personas complete flows without docs.
* **Product KPIs:** Active streams, MAE (monthly active employees), # PoI checks, verifier integrations, % repeated checks.

---

## 15) Developer Docs & Links

* **FHEVM Solidity Guides (v0.7)** — encrypted types, inputs, ACL, quick start: [https://docs.zama.ai/protocol/solidity-guides/v0.7](https://docs.zama.ai/protocol/solidity-guides/v0.7) ([docs.zama.ai](https://docs.zama.ai/protocol/solidity-guides/v0.7?utm_source=chatgpt.com "Overview | Protocol - docs.zama.ai"))
* **Protocol announcement & public testnet** : [https://www.zama.ai/post/announcing-the-zama-confidential-blockchain-protocol](https://www.zama.ai/post/announcing-the-zama-confidential-blockchain-protocol) ([Zama](https://www.zama.ai/post/announcing-the-zama-confidential-blockchain-protocol?utm_source=chatgpt.com "Announcing Our Series B and the Zama Confidential Blockchain Protocol"))
* **fhEVM Coprocessor (Sepolia)** : [https://www.zama.ai/post/fhevm-coprocessor](https://www.zama.ai/post/fhevm-coprocessor) ([Zama](https://www.zama.ai/post/fhevm-coprocessor?utm_source=chatgpt.com "Introducing the fhEVM Coprocessor: Run FHE smart contracts on Ethereum ..."))
* **FHE 6-min intro (for README/marketing)** : [https://6min.zama.ai/](https://6min.zama.ai/) ([6min.zama.ai](https://6min.zama.ai/?utm_source=chatgpt.com "Fully Homomorphic Encryption (FHE) explained - Zama"))
* **Zama Developer Program FAQ / Builder Track** : [https://docs.zama.ai/programs/developer-program/frequently-asked-questions](https://docs.zama.ai/programs/developer-program/frequently-asked-questions) ([docs.zama.ai](https://docs.zama.ai/programs/developer-program/frequently-asked-questions.md?utm_source=chatgpt.com "docs.zama.ai"))
* **Streaming payroll (context)** : [https://docs.sablier.com/concepts/streaming](https://docs.sablier.com/concepts/streaming) ([docs.sablier.com](https://docs.sablier.com/concepts/streaming?utm_source=chatgpt.com "Streaming | Sablier Docs"))

---

## 16) File/Repo Structure (recommended)

```
payproof/
├─ apps/web/                 # Next.js app (React, TS)
│  ├─ app/
│  │  ├─ employer/
│  │  ├─ employee/
│  │  ├─ verify/
│  │  └─ layout.tsx
│  ├─ components/
│  │  ├─ PayrollStreamForm.tsx
│  │  ├─ PayslipCard.tsx
│  │  ├─ PoIAttestationPanel.tsx
│  │  └─ CipherBadge.tsx
│  ├─ lib/crypto/            # FHEVM client utils (encrypt/decrypt helpers)
│  ├─ lib/viem/              # RPC/ABI, network config
│  └─ env.example
├─ contracts/
│  ├─ EncryptedPayroll.sol
│  └─ IncomeOracle.sol
├─ scripts/                  # deploy, seed, demo flows
├─ package.json              # workspaces
└─ README.md                 # setup, demo steps, arch diagram
```

---

## 17) Submission Checklist (Builder Track)

* Guild prerequisites: join https://guild.xyz/zama/developer-program, connect wallet, email, and GitHub; verify Builder Track role before hacking.
* Live demo on Protocol testnet or Sepolia Coprocessor, with 3 persona flows recorded.
* Public GitHub repo (MIT/Apache-2), contracts + Next.js app, clear README with setup, test, and deployment instructions.
* Attestation verify snippet + on-chain refs (tx hashes for stream funding + `Attested` event linked in README).
* Submission timing: submit Builder Track form before 23:59 AOE on the month’s final calendar day; include demo URL, repo, and documentation bundle.
* Reward readiness: double-check Guild connections (wallet/email/GitHub) so Zama can attribute rewards post-review.
* Post-launch comms: post your walkthrough thread and tag **@zama_fhe** / **#ZamaCreatorProgram**.

---

If you want, I can spin up the repo scaffold and drop in `EncryptedPayroll.sol` / `IncomeOracle.sol` stubs, Next.js pages, encryption helpers, and a 2–3 minute demo script so you can start recording today.
