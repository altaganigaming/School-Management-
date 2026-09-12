import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin } from "@/lib/auth";
import { PageHeader, Badge } from "@/components/ui";
import { PERMISSIONS } from "@/lib/permissions";
import { updatePermissions } from "@/lib/actions/accounts";

export const dynamic = "force-dynamic";

export default async function RolesPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireSuperAdmin();
  const sp = await searchParams;
  const admin = createAdminClient();
  const { data: admins } = await admin.from("profiles")
    .select("*").in("role", ["teacher", "staff"]).order("full_name");

  const groups = [...new Set(PERMISSIONS.map((p) => p.group))];

  return (
    <>
      <PageHeader title="Roles & Permissions" subtitle="Assign granular permissions to Teachers and Staff. They can never elevate their own access — only the Principal can change permissions." />
      {sp.saved && <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 ring-1 ring-emerald-200">Permissions saved.</div>}
      <div className="space-y-6">
        {(admins || []).map((a) => (
          <form key={a.id} action={updatePermissions} className="card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-bold text-slate-900">{a.full_name}</span>{" "}
                <span className="font-mono text-xs text-slate-400">@{a.username}</span>{" "}
                <Badge color={a.role === "teacher" ? "green" : "blue"}>{a.role}</Badge>{" "}
                <Badge color={a.is_active ? "green" : "red"}>{a.is_active ? "active" : "inactive"}</Badge>
              </div>
              <button className="btn-primary btn-sm">Save Permissions</button>
            </div>
            <input type="hidden" name="user_id" value={a.id} />
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {groups.map((g) => (
                <div key={g} className="rounded-xl bg-slate-50 p-3">
                  <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{g}</div>
                  <div className="space-y-1.5">
                    {PERMISSIONS.filter((p) => p.group === g).map((p) => (
                      <label key={p.key} className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" name="permissions" value={p.key} defaultChecked={(a.permissions || []).includes(p.key)}
                          className="h-4 w-4 rounded border-slate-300 text-primary-600" />
                        {p.label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </form>
        ))}
        {!admins?.length && <p className="text-slate-400">No teacher/staff accounts yet — create them from Users & Accounts.</p>}
      </div>
    </>
  );
}
