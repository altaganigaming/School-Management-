import Link from "next/link";
import { login } from "@/lib/actions/auth";
import { getSettings } from "@/lib/auth";

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const s = await getSettings();
  const error = sp.error;
  const next = sp.next?.startsWith("/admin") || sp.next?.startsWith("/portal") ? sp.next : "";

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-900 via-primary-700 to-primary-500 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/15 font-display text-2xl font-bold text-white backdrop-blur">
            {(s.school_name || "S")[0]}
          </div>
          <h1 className="font-display text-2xl font-bold text-white">{s.school_name}</h1>
          <p className="text-sm text-primary-100">School Management System — Sign In</p>
        </div>
        <form action={login} className="card space-y-4 !bg-white/95">
          <input type="hidden" name="next" value={next} />
          {error === "1" && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">Invalid username or password.</div>}
          {error === "disabled" && <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">This account has been deactivated. Contact the school office.</div>}
          <div>
            <label className="label">Username</label>
            <input name="username" required className="input" placeholder="e.g. principal / teacher / student username" autoComplete="username" />
          </div>
          <div>
            <label className="label">Password</label>
            <input name="password" type="password" required className="input" placeholder="Your password" autoComplete="current-password" />
          </div>
          <button className="btn-primary w-full">Sign In</button>
          <p className="text-center text-xs text-slate-400">
            Accounts are created by the school. <Link href="/" className="text-primary-600 hover:underline">Back to website</Link>
          </p>
        </form>
      </div>
    </main>
  );
}
