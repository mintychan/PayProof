# PayProof Demo Video Script (~2 minutes)

**Setup before recording:**
- Open the app at localhost:3000 (or deployed URL)
- Browser window at 1440x900
- Connect MetaMask to Sepolia
- Have the app fully loaded

---

## Scene 1: Landing Page (0:00 - 0:20)

**[Show: Landing page at `/`]**

> "Hey, this is PayProof — a privacy-preserving payroll system built on Zama's fhEVM.
>
> The problem is simple: on-chain payroll today exposes everyone's salary publicly. With PayProof, salary amounts stay encrypted on-chain using fully homomorphic encryption while still supporting real-time streaming, withdrawals, and income verification.
>
> Let me walk you through the four steps: Encrypt, Stream, Decrypt, and Verify."

**[Action: Scroll down slowly to show "How It Works" section and the feature cards]**

---

## Scene 2: Employer Flow (0:20 - 0:55)

**[Action: Click "Start as Employer" or navigate to `/employer`]**

> "As an employer, I see my dashboard with wallet info, active streams count, and network status."

**[Action: Point to the stats cards at top]**

> "To create a payroll stream, I fill in the employee's wallet address and a monthly rate. The rate gets encrypted client-side using fhEVM before it ever touches the blockchain — nobody can see the actual salary amount, not even block explorers."

**[Action: Show the create stream form — fill in an employee address and rate. Point to the "How it works" panel on the right]**

> "I can also batch-create streams by uploading a CSV file — useful for companies with dozens or hundreds of employees."

**[Action: Scroll down to show CSV Batch Upload section]**

> "The Employee Directory tab lets me manage all my employees in one place — add labels, filter by status, and export as CSV."

**[Action: Click the "Employee Directory" tab to show it]**

---

## Scene 3: Employee Flow (0:55 - 1:25)

**[Action: Navigate to `/employee`]**

> "Switching to the employee view — I can see all my incoming payment streams. The salary rate is shown as an encrypted handle — just a ciphertext. Nobody browsing the blockchain can read it."

**[Action: Point to the "Your Streams" section. If streams exist, point to the encrypted rate handle. If no streams, mention the empty state]**

> "When I click into a stream, I can sign an EIP-712 message to decrypt my salary right here in the browser. The decrypted amount never leaves my device."

**[Action: If a stream exists, click into it and show the stream detail page at `/stream/[id]`. Point to the decrypt button area]**

> "Once decrypted, I can generate a professional payslip as a PDF — showing the pay period, gross salary, total streamed, and withdrawn amounts. It's like a traditional paycheck stub, but backed by on-chain encrypted data."

**[Action: If decrypted data is visible, show/click the "Generate Payslip" button]**

---

## Scene 4: Income Verification (1:25 - 1:45)

**[Action: Navigate to `/verify`]**

> "This is where it gets really interesting. A third party — like a landlord or a lender — can verify that someone's income meets a threshold, without ever learning the actual salary.
>
> They enter the employer address, a threshold amount, and a lookback window. The threshold gets encrypted with fhEVM, and the IncomeOracle smart contract compares two encrypted values on-chain. The result is a tier — A, B, or C — showing if the income meets, exceeds, or far exceeds the threshold."

**[Action: Show the form fields — employer address, threshold, lookback. Point to the Attestation Tiers panel on the right showing A/B/C tiers]**

> "This is only possible with fully homomorphic encryption — the contract computes on ciphertexts directly. The verifier never learns the salary, and the employee never reveals it."

---

## Scene 5: Proof of Employment (1:45 - 2:00)

**[Action: Navigate to `/employee/proof`]**

> "Finally, employees can generate a Proof of Employment — a verifiable credential showing they have an active payroll stream from a specific employer, how long it's been active, and whether their income meets a minimum threshold.
>
> This is the killer use case for FHE payroll — proving income for loans, apartment rentals, or visa applications without revealing your salary. It's something that's only possible when you can compute on encrypted data."

**[Action: Show the proof page — point to "Select Stream", "Choose Proof Type" (Employment vs Income Threshold), and the generate button]**

> "That's PayProof — private payroll streaming, encrypted payslips, and zero-knowledge income verification, all powered by Zama's fhEVM. Thanks for watching."

---

## Recording Tips

1. **Use QuickTime** (File > New Screen Recording) or Loom for easy recording
2. **Speak naturally** — don't rush. Pause briefly between sections
3. **Move your mouse slowly** to guide the viewer's eye to what you're describing
4. **If you stumble**, just pause and re-say the sentence — you can trim it in editing
5. **Total target: ~2 minutes** — it's okay to be slightly under or over
6. **Resolution:** Record at 1440x900 or 1920x1080 for crisp quality
