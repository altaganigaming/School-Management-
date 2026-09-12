import { getSettings } from "@/lib/auth";

export default async function SiteFooter() {
  const s = await getSettings();
  const contact = s.contact || {};
  return (
    <footer className="mt-20 bg-slate-900 text-slate-300">
      <div className="page-wrap grid gap-10 py-14 md:grid-cols-3">
        <div>
          <div className="font-display text-xl font-bold text-white">{s.school_name}</div>
          <p className="mt-3 max-w-sm text-sm text-slate-400">{s.about || ""}</p>
        </div>
        <div>
          <div className="mb-3 text-sm font-semibold uppercase tracking-wider text-white">Contact</div>
          <p className="text-sm">{contact.address}</p>
          <p className="mt-1 text-sm">📞 {contact.phone}</p>
          <p className="text-sm">✉️ {contact.email}</p>
        </div>
        <div>
          <div className="mb-3 text-sm font-semibold uppercase tracking-wider text-white">Quick Links</div>
          <div className="grid grid-cols-2 gap-1 text-sm">
            <a href="/#about" className="hover:text-white">About</a>
            <a href="/#admissions" className="hover:text-white">Admissions</a>
            <a href="/downloads" className="hover:text-white">Downloads</a>
            <a href="/gallery" className="hover:text-white">Gallery</a>
            <a href="/login" className="hover:text-white">Login</a>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} {s.school_name}. All rights reserved.
      </div>
    </footer>
  );
}
