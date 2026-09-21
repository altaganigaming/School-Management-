import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/auth";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import { submitAdmission } from "@/lib/actions/content";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const s = await getSettings();
  const supabase = await createClient();
  const [{ data: notices }, { data: events }, { data: gallery }, { data: teachers }, { data: achievements }] = await Promise.all([
    supabase.from("notices").select("*").eq("is_published", true).order("published_at", { ascending: false }).limit(5),
    supabase.from("events").select("*").order("event_date", { ascending: false }).limit(3),
    supabase.from("gallery").select("*").order("created_at", { ascending: false }).limit(6),
    supabase.from("teachers").select("id, qualification, profiles(full_name, avatar_url), subjects(name)").order("employee_id").limit(12),
    supabase.from("achievements").select("*").order("achieved_on", { ascending: false }).limit(4),
  ]);
  const facilities: string[] = s.facilities || [];
  const contact = s.contact || {};

  return (
    <>
      <SiteHeader />
      {/* HERO */}
      <section className="relative flex min-h-[min(85vh,720px)] items-center justify-center overflow-hidden px-4 text-center text-white sm:px-0">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-950/80 via-primary-900/60 to-primary-700/40" />
        {s.hero_image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.hero_image} alt="School campus" fetchPriority="high" className="absolute inset-0 -z-10 h-full w-full object-cover" />
        )}
        <div className="page-wrap py-16 sm:py-24">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-white/15 text-3xl font-bold backdrop-blur ring-4 ring-white/20 sm:mb-6 sm:h-24 sm:w-24 sm:text-4xl">
            {s.logo_url ? <img src={s.logo_url} className="h-full w-full rounded-full object-cover" alt="logo" /> : (s.school_name || "S")[0]}
          </div>
          <h1 className="mx-auto max-w-3xl font-display text-3xl font-bold leading-tight sm:text-6xl">{s.school_name}</h1>
          <p className="mt-3 text-base text-primary-100 sm:mt-4 sm:text-lg">{s.tagline}</p>
          <div className="mx-auto mt-7 grid w-full max-w-sm gap-3 sm:mt-8 sm:flex sm:max-w-none sm:justify-center">
            <Link href="#admissions" className="btn bg-white px-6 py-3 text-primary-700 hover:bg-primary-50">Apply for Admission</Link>
            <Link href="/login" className="btn border border-white/40 px-6 py-3 text-white hover:bg-white/10">Portal Login</Link>
          </div>
        </div>
      </section>

      {/* ABOUT / VISION / MISSION */}
      <section id="about" className="page-wrap grid gap-6 py-20 md:grid-cols-3">
        <div className="card md:col-span-2">
          <h2 className="section-title">About Us</h2>
          <p className="mt-4 leading-relaxed text-slate-600">{s.about}</p>
        </div>
        <div className="space-y-6">
          <div className="card border-t-4 border-primary-500">
            <h3 className="font-display text-xl font-bold">🎯 Our Vision</h3>
            <p className="mt-2 text-sm text-slate-600">{s.vision}</p>
          </div>
          <div className="card border-t-4 border-accent-500">
            <h3 className="font-display text-xl font-bold">🚀 Our Mission</h3>
            <p className="mt-2 text-sm text-slate-600">{s.mission}</p>
          </div>
        </div>
      </section>

      {/* PRINCIPAL MESSAGE */}
      <section className="bg-white py-20">
        <div className="page-wrap max-w-3xl text-center">
          <h2 className="section-title">Principal's Message</h2>
          <div className="mt-8 rounded-2xl bg-primary-50 p-8 text-left leading-relaxed text-slate-700 shadow-inner [&_strong]:text-primary-800"
            dangerouslySetInnerHTML={{ __html: s.principal_message || "" }} />
        </div>
      </section>

      {/* FACILITIES */}
      <section id="facilities" className="page-wrap py-20">
        <h2 className="section-title text-center">World-Class Facilities</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {facilities.map((f, i) => (
            <div key={i} className="card text-center hover:-translate-y-1 hover:shadow-md transition">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-xl text-primary-700">✦</div>
              <div className="font-semibold text-slate-800">{f}</div>
            </div>
          ))}
        </div>
      </section>

      {/* NOTICES */}
      <section id="notices" className="bg-slate-100/60 py-20">
        <div className="page-wrap">
          <h2 className="section-title text-center">Notices & News</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {(notices || []).map((n) => (
              <div key={n.id} className="card">
                <span className="badge bg-primary-100 text-primary-700 capitalize">{n.category}</span>
                <h3 className="mt-2 font-bold text-slate-900">{n.title}</h3>
                <p className="mt-1 text-sm text-slate-500 line-clamp-3">{n.body}</p>
                <p className="mt-3 text-xs text-slate-400">{new Date(n.published_at).toLocaleDateString()}</p>
              </div>
            ))}
            {!notices?.length && <p className="text-center text-slate-400 md:col-span-3">No notices published yet.</p>}
          </div>
        </div>
      </section>

      {/* FACULTY */}
      <section id="faculty" className="page-wrap py-20">
        <h2 className="section-title text-center">Our Faculty</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {(teachers || []).map((t) => (
            <div key={t.id} className="card text-center">
              {t.profiles?.[0]?.avatar_url ? (
                <img src={t.profiles[0].avatar_url} alt={t.profiles[0].full_name} loading="lazy" className="mx-auto h-20 w-20 rounded-full object-cover ring-4 ring-primary-100" />
              ) : (
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 text-2xl font-bold text-primary-700">
                  {(t.profiles?.[0]?.full_name || "T")[0]}
                </div>
              )}
              <div className="mt-3 font-bold text-slate-900">{t.profiles?.[0]?.full_name}</div>
              <div className="text-sm text-primary-600">{t.subjects?.[0]?.name || "Faculty"}</div>
              <div className="text-xs text-slate-400">{t.qualification}</div>
            </div>
          ))}
          {!teachers?.length && <p className="text-center text-slate-400 md:col-span-4">Faculty list will be updated soon.</p>}
        </div>
      </section>

      {/* ACHIEVEMENTS */}
      {!!achievements?.length && (
        <section className="bg-slate-900 py-20 text-white">
          <div className="page-wrap">
            <h2 className="section-title !text-white text-center">Achievements</h2>
            <div className="mt-10 grid gap-4 md:grid-cols-4">
              {achievements.map((a) => (
                <div key={a.id} className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
                  <div className="text-2xl">🏆</div>
                  <div className="mt-2 font-bold">{a.title}</div>
                  <p className="mt-1 text-sm text-slate-300">{a.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* GALLERY */}
      <section className="page-wrap py-20">
        <div className="flex items-end justify-between">
          <h2 className="section-title">Gallery</h2>
          <Link href="/gallery" className="text-sm font-semibold text-primary-600 hover:underline">View all →</Link>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3">
          {(gallery || []).map((g) => (
            <img key={g.id} src={g.image_url} alt={g.title} loading="lazy" className="h-52 w-full rounded-xl object-cover hover:scale-[1.02] transition" />
          ))}
        </div>
      </section>

      {/* EVENTS */}
      {!!events?.length && (
        <section className="bg-slate-100/60 py-20">
          <div className="page-wrap">
            <h2 className="section-title text-center">Upcoming Events</h2>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {events.map((e) => (
                <div key={e.id} className="card flex gap-4">
                  <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-primary-600 text-white">
                    <span className="text-lg font-bold leading-none">{new Date(e.event_date).getDate()}</span>
                    <span className="text-[10px] uppercase">{new Date(e.event_date).toLocaleString("en-US", { month: "short" })}</span>
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{e.title}</div>
                    <p className="text-sm text-slate-500 line-clamp-2">{e.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ADMISSIONS */}
      <section id="admissions" className="page-wrap py-20">
        <div className="card overflow-hidden md:flex">
          <div className="bg-gradient-to-br from-primary-600 to-primary-800 p-10 text-white md:w-1/3">
            <h2 className="font-display text-3xl font-bold">Admissions Open</h2>
            <p className="mt-3 text-primary-100">Give your child the gift of quality education.</p>
            <Link href="/downloads" className="btn mt-6 bg-white text-primary-700 hover:bg-primary-50">Download Admission Form</Link>
          </div>
          <div className="p-10 md:w-2/3">
            <h3 className="font-bold text-slate-900">How to Apply</h3>
            <p className="mt-3 leading-relaxed text-slate-600">{s.admission_info}</p>
            {sp.admission === "sent" && <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">Application submitted. The school office will contact you soon.</p>}
            {sp.admission === "error" && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">Please fill in the required fields.</p>}
            <form action={submitAdmission} className="mt-6 grid gap-3 sm:grid-cols-2">
              <input name="student_name" className="input" placeholder="Student name *" required />
              <input name="parent_name" className="input" placeholder="Parent name" />
              <input name="email" type="email" className="input" placeholder="Email *" required />
              <input name="phone" type="tel" className="input" placeholder="Phone *" required />
              <input name="class_name" className="input" placeholder="Class applying for" />
              <input name="message" className="input" placeholder="Message" />
              <button className="btn-primary sm:col-span-2">Submit Admission Enquiry</button>
            </form>
            <div className="mt-6 rounded-xl bg-primary-50 p-4 text-sm text-primary-800">
              📞 Contact the school office at {contact.phone} for enquiries.
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT + MAP */}
      <section id="contact" className="bg-white py-20">
        <div className="page-wrap grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="section-title">Contact Us</h2>
            <div className="mt-6 space-y-4 text-slate-600">
              <p className="flex gap-3"><span>📍</span>{contact.address}</p>
              <p className="flex gap-3"><span>📞</span>{contact.phone}</p>
              <p className="flex gap-3"><span>✉️</span>{contact.email}</p>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200">
            <iframe src={contact.map_embed} width="100%" height="320" style={{ border: 0 }} loading="lazy" title="School map" />
          </div>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
