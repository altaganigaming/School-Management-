import Link from "next/link";
import { redirect } from "next/navigation";
import { requireLogin } from "@/lib/auth";
import { logout } from "@/lib/actions/auth";

export const dynamic = "force-dynamic";

const STUDENT_LINKS = [
  ["/portal", "🏠 Dashboard"], ["/portal/fees", "💰 Fees & Payments"],
  ["/portal/homework", "📚 Homework"], ["/portal/materials", "📖 Study Materials"],
  ["/portal/timetable", "🗓️ Timetable"], ["/portal/exams", "📝 Exams & Results"],
  ["/portal/attendance", "✅ Attendance"], ["/portal/notices", "📢 Notices"],
];
const STAFF_LINKS = [
  ["/portal", "🏠 Dashboard"], ["/portal/salaries", "💵 Salary Records"],
  ["/portal/documents", "📄 Documents"], ["/portal/profile", "👤 Profile"],
];

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireLogin();
  if (profile.role === "super_admin") redirect("/admin");
  const links = profile.role === "student"
    ? [...STUDENT_LINKS, ["/portal/documents", "📄 Documents"], ["/portal/profile", "👤 Profile"]]
    : STAFF_LINKS;
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="page-wrap flex h-14 items-center justify-between">
          <Link href="/portal" className="font-display font-bold text-slate-900">🎓 {profile.role === "student" ? "Student" : profile.role === "teacher" ? "Teacher" : "Staff"} Portal</Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden sm:block text-slate-500">{profile.full_name}</span>
            <form action={logout}><button className="btn-danger btn-sm">Logout</button></form>
          </div>
        </div>
        <nav className="page-wrap flex gap-1 overflow-x-auto pb-2 text-sm">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className="whitespace-nowrap rounded-lg px-3 py-1.5 text-slate-600 hover:bg-primary-50 hover:text-primary-700">{label}</Link>
          ))}
        </nav>
      </header>
      <main className="page-wrap py-8">{children}</main>
    </div>
  );
}
