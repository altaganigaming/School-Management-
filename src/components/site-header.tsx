import Link from "next/link";
import { getSettings, getProfile } from "@/lib/auth";

export default async function SiteHeader() {
  const settings = await getSettings();
  const profile = await getProfile();
  const name = settings.school_name || "School";
  const logo = settings.logo_url;

  const links = [
    ["About", "/#about"], ["Facilities", "/#facilities"], ["Faculty", "/#faculty"],
    ["Gallery", "/gallery"], ["Notices", "/#notices"], ["Downloads", "/downloads"],
    ["Admissions", "/admissions"], ["Contact", "/#contact"],
  ];

  return (
    <>
    {settings.favicon_url && <link rel="icon" href={settings.favicon_url} />}
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="page-wrap flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="logo" className="h-10 w-10 rounded-full object-cover ring-2 ring-primary-100" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 font-display text-lg font-bold text-white">S</div>
          )}
          <div>
            <div className="font-display text-lg font-bold leading-tight text-slate-900">{name}</div>
            <div className="text-[11px] text-slate-500">{settings.tagline || ""}</div>
          </div>
        </Link>
        <details className="group relative">
          <summary aria-label="Open website menu" className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
            <span className="sr-only">Open website menu</span>
            <span aria-hidden="true" className="flex w-5 flex-col gap-1">
              <span className="h-0.5 w-full rounded bg-current" />
              <span className="h-0.5 w-full rounded bg-current" />
              <span className="h-0.5 w-full rounded bg-current" />
            </span>
          </summary>
          <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
            <nav className="grid gap-1 text-sm">
              {links.map(([label, href]) => (
                <Link key={href} href={href} className="rounded-md px-3 py-2 text-slate-700 hover:bg-primary-50 hover:text-primary-800">{label}</Link>
              ))}
            </nav>
            <div className="mt-2 border-t border-slate-200 pt-2">
              <Link href={profile ? (profile.role === "student" ? "/portal" : "/admin") : "/login"} className="block rounded-md px-3 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-50">
                {profile ? "Dashboard" : "Login"}
              </Link>
            </div>
          </div>
        </details>
      </div>
    </header>
    </>
  );
}
