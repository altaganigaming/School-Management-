import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { logout } from "@/lib/actions/auth";
import { ADMIN_MODULES, hasPerm, ROLE_LABELS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAdmin();
  const modules = ADMIN_MODULES.filter(
    (m) => !m.superOnly || profile.role === "super_admin"
  ).filter((m) => !m.perm || hasPerm(profile.role, profile.permissions, m.perm));

  return (
    <div className="flex min-h-screen">
      {/* SIDEBAR */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-900 text-slate-300 lg:flex">
        <Link href="/admin" className="border-b border-slate-800 p-5">
          <div className="font-display text-lg font-bold text-white">🏫 School Admin</div>
          <div className="text-xs text-slate-400">{ROLE_LABELS[profile.role]}</div>
        </Link>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3 text-sm">
          {modules.map((m) => (
            <Link key={m.href} href={m.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-800 hover:text-white">
              <span className="w-5 text-center">{m.icon}</span> {m.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-slate-800 p-4 text-xs">
          <div className="font-semibold text-white">{profile.full_name}</div>
          <div className="text-slate-400">@{profile.username}</div>
          <div className="mt-3 flex gap-2">
            <Link href="/" className="btn-secondary btn-sm flex-1">Website</Link>
            <form action={logout}><button className="btn-danger btn-sm w-full">Logout</button></form>
          </div>
        </div>
      </aside>

      {/* MOBILE TOP BAR */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white p-3 lg:hidden">
          <Link href="/admin" className="font-display font-bold text-slate-900">🏫 Admin</Link>
          <form action={logout}><button className="btn-danger btn-sm">Logout</button></form>
        </div>
        <details className="border-b border-slate-200 bg-slate-50 lg:hidden">
          <summary className="cursor-pointer p-3 text-sm font-semibold text-slate-600">☰ Modules ({modules.length})</summary>
          <nav className="grid grid-cols-2 gap-1 p-3 pt-0 text-sm">
            {modules.map((m) => (
              <Link key={m.href} href={m.href} className="rounded-lg px-3 py-2 hover:bg-white">
                {m.icon} {m.label}
              </Link>
            ))}
          </nav>
        </details>
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
