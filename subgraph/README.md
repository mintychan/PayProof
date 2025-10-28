## PayProof Subgraph

This subgraph indexes the on-chain `EncryptedPayroll` contract so dashboards can
list sender and recipient streams without scanning 10k blocks in the browser.

### What it captures

- `Stream` entities keyed by `streamKey` (bytes32) with employer, employee, cadence, status, and configuration flags.
- `StreamEvent` entities for lifecycle changes (create/cancel/pause/resume/settle), top-ups, withdrawals, and hook updates.
- Block, timestamp, and tx hash metadata so you can build history timelines.

### Project structure

```
subgraph/
├── abis/EncryptedPayroll.json    # copy generated ABI here after contracts compile
├── schema.graphql                # entity definitions
├── src/mapping.ts                # event handlers
├── subgraph.yaml                 # manifest (update startBlock/network as needed)
├── package.json                  # Graph CLI + AssemblyScript toolchain
└── tsconfig.json
```

### Getting started

1. Compile contracts to refresh the ABI:
   ```bash
   pnpm --filter @payproof/contracts build
   cp contracts/artifacts/contracts/EncryptedPayroll.sol/EncryptedPayroll.json subgraph/abis/EncryptedPayroll.json
   ```
2. (Optional) Update `subgraph.yaml`:
   - `network` if you deploy outside Sepolia.
   - `startBlock` to the deployment block of your instance.
3. Install dependencies and generate types:
   ```bash
   pnpm --filter @payproof/subgraph install
   pnpm --filter @payproof/subgraph run codegen
   ```
4. Build and deploy (hosted service example):
   ```bash
   pnpm --filter @payproof/subgraph run build
   GRAPH_DEPLOY_KEY=... pnpm --filter @payproof/subgraph run deploy
   ```

Once deployed, point the web app at the subgraph endpoint via
`NEXT_PUBLIC_PAYPROOF_SUBGRAPH_URL`.
