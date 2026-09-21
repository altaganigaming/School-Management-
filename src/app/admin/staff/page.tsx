import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { PageHeader, Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  await requireAdmin("manage_faculty");
  const admin = createAdminClient();
  const { data: staff } = await admin.from("profiles").select("*").eq("role", "staff").order("full_name");
  return (
    <>
      <PageHeader title="Office Staff" subtitle="Non-teaching staff accounts." actions={
        <a href="/admin/users" className="btn-primary">➕ Create Staff Account</a>
      } />
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>Name</th><th>Username</th><th>Phone</th><th>Permissions</th><th>Status</th></tr></thead>
          <tbody>
            {(staff || []).map((s) => (
              <tr key={s.id}>
                <td className="font-medium">{s.full_name}</td>
                <td className="font-mono text-xs text-slate-400">@{s.username}</td>
                <td>{s.phone || "—"}</td>
                <td><Badge color="purple">{(s.permissions || []).length} granted</Badge></td>
                <td><Badge color={s.is_active ? "green" : "red"}>{s.is_active ? "Active" : "Inactive"}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!staff?.length && <p className="py-10 text-center text-slate-400">No staff accounts yet.</p>}
      </div>
      <p className="mt-4 text-sm text-slate-500">Grant or revoke permissions from <a href="/admin/roles" className="text-primary-600 underline">Roles & Permissions</a>.</p>
    </>
  );
}
