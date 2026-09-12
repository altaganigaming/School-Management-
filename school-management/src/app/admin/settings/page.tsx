import { requireSuperAdmin, getSettings } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { changeMyPassword } from "@/lib/actions/accounts";

export const dynamic = "force-dynamic";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireSuperAdmin();
  const sp = await searchParams;
  const s = await getSettings();

  return (
    <>
      <PageHeader title="School Settings" subtitle="Principal-only controls." />
      {sp.pw && <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 ring-1 ring-emerald-200">Password updated.</div>}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="card-title">🔑 Change My Password</h2>
          <form action={changeMyPassword} className="mt-4 space-y-3">
            <label className="block"><span className="label">New Password</span>
              <input name="password" type="password" className="input" required minLength={8} /></label>
            <button className="btn-primary">Update Password</button>
          </form>
        </div>
        <div className="card">
          <h2 className="card-title">🏫 System Summary</h2>
          <div className="mt-4 space-y-2 text-sm text-slate-600">
            <p><b>School:</b> {s.school_name}</p>
            <p><b>Website content:</b> managed via <a href="/admin/website" className="text-primary-600 underline">Website CMS</a></p>
            <p><b>Accounts:</b> managed via <a href="/admin/users" className="text-primary-600 underline">Users & Accounts</a></p>
            <p><b>Permissions:</b> managed via <a href="/admin/roles" className="text-primary-600 underline">Roles & Permissions</a></p>
            <p className="text-xs text-slate-400 pt-2">Fee architecture supports a future payment gateway: payment intents can write to payment_proofs or fee_records with the same approve/receipt flow.</p>
          </div>
        </div>
      </div>
    </>
  );
}
