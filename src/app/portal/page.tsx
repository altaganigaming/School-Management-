import { createClient } from "@/lib/supabase/server";
import { requireStudent } from "@/lib/auth";
import { StatCard, Badge } from "@/components/ui";
import { formatCurrency, monthLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PortalHome() {
  const profile = await requireStudent();
  const supabase = await createClient();
  const { data: student } = await supabase.from("students")
    .select("*, classes(name, section)").eq("profile_id", profile.id).single();
  const { data: fees } = await supabase.from("fee_records").select("*").eq("student_id", student?.id);
  const { data: attendance } = await supabase.from("attendance").select("status").eq("student_id", student?.id);
  const { data: homework } = await supabase.from("homework").select("*").eq("class_id", student?.class_id).order("due_date", { ascending: false }).limit(3);

  const paid = (fees || []).filter((f) => f.status === "paid").reduce((a, b) => a + Number(b.amount), 0);
  const pending = (fees || []).filter((f) => f.status === "pending").reduce((a, b) => a + Number(b.amount), 0);
  const pendingMonths = (fees || []).filter((f) => f.status === "pending");
  const present = (attendance || []).filter((a) => a.status === "present").length;
  const attRate = attendance?.length ? Math.round((present / attendance.length) * 100) : null;

  return (
    <>
      <div className="card mb-6 bg-gradient-to-r from-primary-600 to-primary-800 !text-white">
        <h1 className="font-display text-2xl font-bold">Welcome, {profile.full_name} 👋</h1>
        <p className="mt-1 text-primary-100">
          Class {student?.classes ? `${student.classes.name} - ${student.classes.section}` : "—"} · Roll No {student?.roll_no ?? "—"} · Adm. No {student?.admission_no}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon="✅" label="Attendance" value={attRate !== null ? `${attRate}%` : "—"} />
        <StatCard icon="💰" label="Fees Paid" value={formatCurrency(paid)} />
        <StatCard icon="⏳" label="Fees Pending" value={formatCurrency(pending)} hint={<a href="/portal/fees" className="text-primary-600 underline">Pay now →</a>} />
        <StatCard icon="🧾" label="Pending Months" value={pendingMonths.length} />
      </div>
      <div className="card mt-6">
        <h2 className="card-title mb-3">Fee Status</h2>
        <div className="flex flex-wrap gap-2">
          {(fees || []).map((f) => (
            <span key={f.id} className={`badge ${f.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
              {monthLabel(f.month)} · {f.status}
            </span>
          ))}
          {!fees?.length && <p className="text-sm text-slate-400">No fee records yet.</p>}
        </div>
      </div>
      {!!homework?.length && (
        <div className="card mt-6">
          <h2 className="card-title mb-3">Latest Homework</h2>
          <div className="space-y-2">
            {homework.map((h) => (
              <div key={h.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm">
                <span className="font-medium">{h.title}</span>
                {h.due_date && <Badge color="amber">Due {h.due_date}</Badge>}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
