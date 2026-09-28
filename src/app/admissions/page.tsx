import Link from "next/link";
import { getSettings } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import { submitAdmission } from "@/lib/actions/content";

export const dynamic = "force-dynamic";

export default async function AdmissionsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const [settings, sp, supabase] = await Promise.all([getSettings(), searchParams, createClient()]);
  const { data: classes } = await supabase.from("classes").select("name, section").order("name").order("section");
  const isOpen = settings.admission_enabled !== false;

  return (
    <>
      <SiteHeader />
      <main className="page-wrap min-h-[65vh] py-12 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <Link href="/" className="text-sm font-medium text-primary-700 hover:underline">← Back to website</Link>
          <h1 className="section-title mt-5">Admissions</h1>
          <p className="mt-3 leading-relaxed text-slate-600">{settings.admission_info || `Apply to ${settings.school_name || "the school"}. Submit an enquiry and the school office will contact you.`}</p>

          {sp.admission === "sent" && <div className="mt-6 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700">Your admission enquiry was submitted. The school office will contact you soon.</div>}
          {sp.admission === "error" && <div className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">We could not submit your enquiry. Check the required details and try again.</div>}

          {isOpen ? (
            <form action={submitAdmission} className="card mt-8 grid gap-4 sm:grid-cols-2">
              <label className="block"><span className="label">Student name *</span><input name="student_name" className="input" autoComplete="name" required /></label>
              <label className="block"><span className="label">Parent name</span><input name="parent_name" className="input" /></label>
              <label className="block"><span className="label">Email *</span><input name="email" type="email" className="input" autoComplete="email" required /></label>
              <label className="block"><span className="label">Phone *</span><input name="phone" type="tel" className="input" autoComplete="tel" required /></label>
              <label className="block"><span className="label">Class / Section</span>
                <select name="class_name" className="input" defaultValue="">
                  <option value="">Select class / section</option>
                  {(classes || []).map((item) => <option key={`${item.name}-${item.section}`} value={`${item.name} - ${item.section}`}>{item.name} - {item.section}</option>)}
                </select>
              </label>
              <label className="block sm:col-span-2"><span className="label">Message</span><textarea name="message" className="input" rows={4} /></label>
              <button className="btn-primary sm:col-span-2">Submit Admission Enquiry</button>
            </form>
          ) : (
            <div className="card mt-8">
              <h2 className="card-title">Online applications are closed</h2>
              <p className="mt-2 text-sm text-slate-600">Contact the school office for admission information or view available documents.</p>
              <Link href="/downloads" className="btn-secondary mt-4">View Documents</Link>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
