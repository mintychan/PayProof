import PayslipCard from "../../components/PayslipCard";
import CipherBadge from "../../components/CipherBadge";
import { encryptNumber } from "../../lib/crypto/encryption";

const PERIOD_INCOME = 4200;
const YTD_INCOME = 50200;

export default function EmployeePage() {
  const ciphertextPeriod = encryptNumber(PERIOD_INCOME);
  const ciphertextYtd = encryptNumber(YTD_INCOME);

  return (
    <section className="space-y-6">
      <header className="grid gap-2">
        <p className="text-sm uppercase tracking-wide text-slate-400">Employee Wallet</p>
        <h2 className="text-2xl font-bold text-white">Decrypt your payslip locally</h2>
        <p className="max-w-3xl text-sm text-slate-300">
          Your payslip data never leaves your device. Download the attestation artifact when a verifier needs proof-of-income.
        </p>
      </header>
      <PayslipCard ciphertextBalance={ciphertextPeriod} periodLabel="September 2025" ytdCiphertext={ciphertextYtd} />
      <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-300">
        <CipherBadge label="Attestation ready" />
        <p>
          Export the JSON proof for lenders or rental agents. They can verify the attestation hash on-chain without seeing your exact salary.
        </p>
      </div>
    </section>
  );
}
