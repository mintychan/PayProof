# PayProof

Confidential payroll streaming and proof-of-income (PoI) attestations for the Zama Builder Track. Employers fund encrypted salary streams, employees decrypt payslips locally, and verifiers request threshold proofs without ever seeing raw income.

## Architecture Snapshot
- **FHEVM smart contracts:** `EncryptedPayroll` for confidential streams, `IncomeOracle` for PoI attestations (deployed on Zama Protocol public testnet or fhEVM Coprocessor on Sepolia).
- **Next.js dApp:** `/employer`, `/employee`, `/verify` routes with client-side FHE encryption/decryption helpers, wagmi/viem for wallet connectivity.
- **Data minimization:** Ciphertext on-chain, ephemeral plaintext in the browser only; attestation outputs are boolean/tier plus event references.

## Local Setup
1. Install Node.js 20+ and `pnpm`. Hardhat ships as a local dependency inside `contracts/`.
2. `pnpm install` (workspace root) to pull web dependencies.
3. Copy `apps/web/.env.example` → `.env` and provide RPC endpoints for Protocol testnet or Sepolia Coprocessor plus demo wallet keys.
4. Copy `contracts/.env.example` → `.env` as needed when deploying to testnets.

## Useful Commands
- `pnpm dev` – launch Next.js app with hot reload.
- `pnpm lint` – run TypeScript + ESLint checks.
- `pnpm test:e2e` – headless Playwright smoke suite for employer/employee/verifier flows.
- `pnpm test:contracts` – Hardhat unit tests covering stream lifecycle and PoI thresholds.
- `pnpm format` – format staged files (if configured).

## Demo Flow Playbook
### Employer Persona
1. Connect employer wallet; select Protocol testnet or Sepolia Coprocessor network.
2. Fill encrypted stream form (employee address, cadence, rate); submit and wait for confirmation toast.
3. Record the transaction hash and stream ID surfaces; copy block explorer link for README/demo notes.

### Employee Persona
1. Switch to employee wallet; visit `/employee`.
2. Trigger data fetch; decrypt current period + YTD; verify ciphertext badge appears on UI.
3. Export proof artifact (JSON/PDF placeholder) and note attestation reference emitted on-chain.

### Verifier Persona
1. Visit `/verify`; input encrypted threshold (UI includes helper).
2. Submit request; confirm resulting tier/boolean and emitted `Attested` event hash.
3. Store attestation reference and verification snippet for documentation.

## Deployment Checklist
1. Choose deployment target: Zama Protocol public testnet (recommended default) or fhEVM Coprocessor (Sepolia). Ensure contracts share consistent encryption keys and access control lists.
2. Execute deployment scripts; capture:
   - Stream creation tx hash
   - Stream funding/top-up tx hash
   - `Attested` event tx hash
3. Update this README with contract addresses, block explorer links, and demo wallet role mapping.
4. Publish the dApp (e.g., Vercel) and smoke test the three persona paths against the deployed contracts.

## Monthly Submission Timeline
- **Program opens:** 1st calendar day (00:00 local time for Zama team).
- **Build window:** Day 1 → final day of month.
- **Submission deadline:** Final day @ 23:59 AOE – submit Builder Track form with demo URL, repo, video, and documentation bundle.
- **Review period:** First half of following month; keep deployments live.
- **Winner announcement:** Following month in Discord `#developer-program`.

## Builder Track Submission Checklist
- Join [Guild.xyz](https://guild.xyz/zama/developer-program), connect wallet, email, GitHub, and confirm the “Builder Track” role shows as active.
- Ensure README (this file) documents setup, testing commands, deployment addresses, and persona guides.
- Record ≤3 minute demo video covering employer, employee, verifier flows.
- Provide attestation verification snippet with linked tx hashes.
- Run `pnpm test:contracts`, `pnpm lint`, and `pnpm test:e2e`; archive successful CI output or screenshots.
- Submit before 23:59 AOE on the final day; include links to live dApp, contracts, repo, and video in the form.
- Keep Guild connections active after submission so rewards can be attributed.

## Guild & Reward Notes
- Zama aggregates rewards until TGE; payouts require the same wallet/email/GitHub connected via Guild.
- If Guild verification fails, email marketing@zama.ai with GitHub, email, Discord handle, and supporting portfolio links.
- Follow `@zama_fhe` and post a recap thread tagging **#ZamaCreatorProgram** once the demo is live.

## Support Channels
- Discord: `#creator-program` for technical questions or feedback.
- Docs: https://docs.zama.ai/protocol/solidity-guides/v0.7 for contract integration tips.
- Community forum: https://community.zama.ai for deployment status updates (Sepolia/Protocol).
