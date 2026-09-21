import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/auth";

export default async function SiteHeader() {
  const settings = await getSettings();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const name = settings.school_name || "School";
  const logo = settings.logo_url;

  const links = [
    ["About", "/#about"], ["Facilities", "/#facilities"], ["Faculty", "/#faculty"],
    ["Gallery", "/gallery"], ["Notices", "/#notices"], ["Downloads", "/downloads"],
    ["Admissions", "/#admissions"], ["Contact", "/#contact"],
  ];

  return (
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
        <nav className="hidden items-center gap-5 text-sm font-medium text-slate-600 lg:flex">
          {links.map(([label, href]) => (
            <Link key={href} href={href} className="hover:text-primary-600">{label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <Link href={user ? "/admin" : "/login"} className="btn-primary btn-sm">Dashboard</Link>
          ) : (
            <Link href="/login" className="btn-primary btn-sm">Login</Link>
          )}
        </div>
      </div>
    </header>
  );
}
