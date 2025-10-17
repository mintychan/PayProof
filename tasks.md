# PayProof Sprint Tasks

Four-week plan aligned with Zama Builder Track monthly cadence (e.g., targeting the November 2025 cohort running Nov 1–Nov 30, 2025). Adjust exact dates to the live season before kickoff.

## Week 1 (Nov 1–Nov 7, 2025) — Contracts & Environment
- Scaffold mono-repo (`contracts/`, `apps/web/`, shared config) and initialize GitHub Actions CI.
- Install and pin FHEVM toolchain; configure Protocol public testnet + Sepolia Coprocessor endpoints.
- Implement `createStream`, `topUp`, `pauseStream`, and `encryptedBalanceOf` skeletons in `contracts/EncryptedPayroll.sol`.
- Write Hardhat unit tests covering happy paths for stream lifecycle and encrypted balance retrieval.
- Add CI jobs for `pnpm test:contracts`, linting, and type checks; ensure green runs on main.
- Document local setup and test commands in `PayProof/README.md`.

## Week 2 (Nov 8–Nov 14, 2025) — Next.js UI & Client Crypto
- Scaffold Next.js App Router pages (`/employer`, `/employee`) with wagmi/viem integration and wallet switching.
- Implement client-side encryption helpers in `apps/web/lib/crypto`; wire to employer stream creation flow.
- Build payslip decrypt experience with ciphertext badges and error handling.
- Seed deterministic demo accounts and provide fixtures for local dev.
- Add Playwright smoke tests covering employer stream creation and employee decrypt flows; run headless in CI.
- Update README with environment variables, wallet roles, and new test commands.

## Week 3 (Nov 15–Nov 21, 2025) — PoI Oracle & Verifier Flow
- Implement `attestMonthlyIncome` logic in `IncomeOracle.sol`, including tiered response and `Attested` event metadata.
- Extend Hardhat tests to cover threshold comparisons (meet/fail) and tier assignments.
- Build `/verify` page UI for encrypted threshold input, request submission, and attestation result display.
- Generate reusable verification snippet (CLI + smart contract call) referencing emitted events.
- Expand Playwright suite to include verifier flow and regression checks for existing scenarios.
- Draft demo script covering all three personas; capture dry-run screenshots.

## Week 4 (Nov 22–Nov 30, 2025) — Deploy, Demo, Submit
- Deploy contracts to chosen network(s); record contract addresses and key transaction hashes.
- Publish Next.js app (e.g., Vercel) pointing to deployed contracts; run smoke tests against production endpoints.
- Record ≤3 minute demo video walking through employer, employee, verifier flows and attestation verification.
- Finalize README with deployment details, verification instructions, and links to demo assets.
- Complete Builder Track submission before Nov 30, 2025 @ 23:59 AOE; include repo, demo URL, video, and explorer links.
- Cross-check Guild.xyz connections (wallet, email, GitHub) and post recap thread tagging `@zama_fhe` / `#ZamaCreatorProgram`.
