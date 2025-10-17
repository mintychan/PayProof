import PayrollStreamForm from "../../components/PayrollStreamForm";

export default function EmployerPage() {
  return (
    <section className="space-y-6">
      <header className="grid gap-2">
        <p className="text-sm uppercase tracking-wide text-slate-400">Employer Console</p>
        <h2 className="text-2xl font-bold text-white">Stream encrypted payroll to your team</h2>
        <p className="max-w-3xl text-sm text-slate-300">
          Encrypt salary parameters locally before sending transactions. The smart contract stores ciphertext only; decryptable payslips stay with employees.
        </p>
      </header>
      <PayrollStreamForm />
    </section>
  );
}
