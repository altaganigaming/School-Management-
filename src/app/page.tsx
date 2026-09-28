import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/auth";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import { listGalleryImages } from "@/lib/gallery";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const s = await getSettings();
  const supabase = await createClient();
  const [{ data: notices }, { data: events }, gallery, { data: teachers }, { data: achievements }] = await Promise.all([
    supabase.from("notices").select("*").eq("is_published", true).order("published_at", { ascending: false }).limit(5),
    supabase.from("events").select("*").order("event_date", { ascending: false }).limit(3),
    listGalleryImages(6),
    supabase.from("teachers").select("id, qualification, profiles(full_name, avatar_url), subjects(name)").order("employee_id").limit(12),
    supabase.from("achievements").select("*").order("achieved_on", { ascending: false }).limit(4),
  ]);
  const facilities: string[] = s.facilities || [];
  const contact = s.contact || {};

  return (
    <>
      <SiteHeader />
      {/* HERO */}
      <section className="relative isolate flex min-h-[min(88vh,780px)] items-center overflow-hidden bg-slate-950 px-4 text-white sm:px-0">
        {s.hero_image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.hero_image} alt="School campus" fetchPriority="high" className="absolute inset-0 z-0 h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-slate-950/90 via-slate-950/70 to-primary-950/30" />
        <div className="absolute -right-24 top-16 z-10 hidden h-80 w-80 rounded-full border border-white/20 lg:block" />
        <div className="page-wrap relative z-20 grid items-center gap-10 py-20 sm:py-24 lg:grid-cols-[1.1fr_.9fr]">
          <div className="home-reveal max-w-3xl">
            <div className="mb-7 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white/15 text-2xl font-bold shadow-xl ring-1 ring-white/30 backdrop-blur sm:h-20 sm:w-20 sm:text-3xl">
              {s.logo_url ? <img src={s.logo_url} className="h-full w-full object-cover" alt={`${s.school_name} logo`} /> : (s.school_name || "S")[0]}
            </div>
            <p className="mb-4 text-xs font-semibold uppercase text-primary-200">A school for curious minds</p>
            <h1 className="max-w-3xl font-display text-4xl font-bold leading-[1.06] sm:text-6xl lg:text-7xl">{s.school_name}</h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/80 sm:text-xl">{s.tagline}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={s.admission_enabled === false ? "/downloads" : "/admissions"} className="btn bg-white px-6 py-3 text-primary-800 shadow-lg hover:-translate-y-0.5 hover:bg-primary-50">
                {s.admission_enabled === false ? "View Admissions Documents" : "Explore Admissions"}
              </Link>
              <Link href="#about" className="btn border border-white/35 bg-white/10 px-6 py-3 text-white backdrop-blur hover:bg-white/20">Discover the School</Link>
            </div>
          </div>
          <div className="home-reveal relative mx-auto min-h-[320px] w-full max-w-xl lg:min-h-[450px]">
            <div className="absolute right-1 top-0 h-[72%] w-[76%] overflow-hidden rounded-[2rem] border border-white/25 bg-white/10 shadow-2xl shadow-black/30 backdrop-blur-sm sm:right-6 sm:w-[72%]">
              {gallery[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={gallery[0].url} alt={gallery[0].title} className="h-full w-full object-cover" />
              ) : s.hero_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.hero_image} alt="School grounds" className="h-full w-full object-cover" />
              ) : <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary-700 to-accent-500 text-6xl text-white/80">✦</div>}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent" />
              <div className="absolute bottom-5 left-5 right-5">
                <span className="text-xs font-semibold uppercase text-white/70">Life at {s.school_name}</span>
                <p className="mt-1 text-lg font-semibold text-white">{gallery[0]?.title || "A place to learn and grow"}</p>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 z-10 w-[76%] rounded-2xl border border-white/60 bg-white p-5 text-slate-800 shadow-2xl shadow-black/25 sm:bottom-3 sm:left-2 sm:w-[65%]">
              <p className="text-xs font-semibold uppercase text-primary-700">Visit or call</p>
              <p className="mt-2 font-display text-xl font-bold">{s.school_name}</p>
              <p className="mt-1 text-sm text-slate-600">{contact.phone || contact.address || "Contact the school office for details."}</p>
            </div>
            <div className="absolute -right-1 bottom-[27%] z-10 hidden rounded-xl bg-accent-500 px-4 py-3 text-sm font-semibold text-white shadow-lg sm:block">Learning with purpose</div>
          </div>
        </div>
      </section>

      {/* ABOUT / VISION / MISSION */}
      <section id="about" className="relative isolate overflow-hidden py-20 sm:py-28">
        <div className="absolute inset-y-10 left-0 -z-10 w-[72%] rounded-r-[4rem] bg-primary-50/80" />
        <div className="page-wrap grid gap-10 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
          <div className="home-reveal max-w-2xl">
            <p className="mb-3 text-xs font-bold uppercase text-primary-700">Our school</p>
            <h2 className="section-title">About Us</h2>
            <p className="mt-6 text-lg leading-relaxed text-slate-700">{s.about}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <article className="home-lift rounded-2xl border border-white bg-white/90 p-6 shadow-xl shadow-primary-900/5 ring-1 ring-primary-100 sm:translate-x-4">
              <span className="text-xs font-bold uppercase text-primary-700">01 · Our Vision</span>
              <h3 className="mt-2 font-display text-2xl font-bold text-slate-900">A direction for every learner</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{s.vision}</p>
            </article>
            <article className="home-lift rounded-2xl border border-white bg-white/95 p-6 shadow-xl shadow-accent-900/5 ring-1 ring-accent-100 sm:-translate-x-3">
              <span className="text-xs font-bold uppercase text-accent-600">02 · Our Mission</span>
              <h3 className="mt-2 font-display text-2xl font-bold text-slate-900">Learning with purpose</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{s.mission}</p>
            </article>
          </div>
        </div>
      </section>

      {/* PRINCIPAL MESSAGE */}
      <section className="relative overflow-hidden bg-slate-950 py-20 text-white sm:py-24">
        <div className="absolute -right-20 top-0 h-72 w-72 rounded-full border border-white/10" />
        <div className="page-wrap relative grid gap-8 lg:grid-cols-[.7fr_1.3fr] lg:items-center">
          <div>
            <p className="mb-3 text-xs font-bold uppercase text-primary-200">A word from our leadership</p>
            <h2 className="font-display text-3xl font-bold sm:text-4xl">Principal's Message</h2>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-7 text-left leading-relaxed text-slate-200 shadow-2xl backdrop-blur sm:p-10 [&_strong]:text-white"
            dangerouslySetInnerHTML={{ __html: s.principal_message || "" }} />
        </div>
      </section>

      {/* FACILITIES */}
      <section id="facilities" className="page-wrap py-20 sm:py-28">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-3 text-xs font-bold uppercase text-primary-700">Spaces to explore</p>
            <h2 className="section-title">World-Class Facilities</h2>
          </div>
          <span className="rounded-full bg-accent-400/15 px-4 py-2 text-sm font-semibold text-accent-600">Designed for every kind of learner</span>
        </div>
        <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {facilities.map((f, i) => (
            <article key={i} className={`home-lift relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-lg shadow-slate-900/5 transition duration-300 hover:-translate-y-1 hover:shadow-xl ${i === 0 ? "sm:col-span-2 sm:row-span-2 bg-primary-700 text-white" : ""}`}>
              <span className={`font-mono text-xs ${i === 0 ? "text-white/60" : "text-primary-500"}`}>{String(i + 1).padStart(2, "0")}</span>
              <div className={`mb-8 mt-5 flex h-12 w-12 items-center justify-center rounded-xl text-xl ${i === 0 ? "bg-white/15 text-white" : "bg-primary-50 text-primary-700"}`}>✦</div>
              <div className={`max-w-xs font-display text-xl font-bold ${i === 0 ? "sm:text-3xl" : "text-slate-900"}`}>{f}</div>
              {i === 0 && <div className="absolute -bottom-10 -right-8 h-36 w-36 rounded-full border border-white/20" />}
            </article>
          ))}
        </div>
      </section>

      {/* NOTICES */}
      <section id="notices" className="relative overflow-hidden bg-slate-100/75 py-20 sm:py-28">
        <div className="page-wrap grid gap-10 lg:grid-cols-[.75fr_1.25fr]">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="mb-3 text-xs font-bold uppercase text-primary-700">From the school</p>
            <h2 className="section-title">Notices & News</h2>
            <p className="mt-4 max-w-sm leading-relaxed text-slate-600">The latest announcements and updates from {s.school_name}.</p>
          </div>
          <div className="space-y-3">
            {(notices || []).map((n, i) => (
              <article key={n.id} className={`home-lift rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg sm:p-6 ${i === 0 ? "border-primary-200 bg-white shadow-lg sm:-ml-6" : "border-slate-200 bg-white/75"}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="badge bg-primary-100 text-primary-800 capitalize">{n.category}</span>
                  <time className="text-xs text-slate-400">{new Date(n.published_at).toLocaleDateString()}</time>
                </div>
                <h3 className="mt-3 font-display text-xl font-bold text-slate-900">{n.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{n.body}</p>
              </article>
            ))}
            {!notices?.length && <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-400">No notices published yet.</p>}
          </div>
        </div>
      </section>

      {/* FACULTY */}
      <section id="faculty" className="relative py-20 sm:py-28">
        <div className="page-wrap">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-3 text-xs font-bold uppercase text-primary-700">People who make it possible</p>
              <h2 className="section-title">Our Faculty</h2>
            </div>
            <span className="text-sm text-slate-500">Dedicated faculty · {teachers?.length ?? 0} profiles</span>
          </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(teachers || []).map((t) => (
            <article key={t.id} className="home-lift group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-900/5 transition duration-300 hover:-translate-y-1 hover:shadow-xl">
              <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-br from-primary-100 via-white to-accent-400/20" />
              {t.profiles?.[0]?.avatar_url ? (
                <img src={t.profiles[0].avatar_url} alt={t.profiles[0].full_name} loading="lazy" className="relative mx-auto h-20 w-20 rounded-full object-cover ring-4 ring-white shadow-lg" />
              ) : (
                <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 text-2xl font-bold text-primary-700 ring-4 ring-white shadow-lg">
                  {(t.profiles?.[0]?.full_name || "T")[0]}
                </div>
              )}
              <div className="mt-5 font-display text-lg font-bold text-slate-900">{t.profiles?.[0]?.full_name}</div>
              <div className="mt-1 text-sm font-medium text-primary-700">{t.subjects?.[0]?.name || "Faculty"}</div>
              <div className="mt-2 text-xs text-slate-500">{t.qualification}</div>
            </article>
          ))}
          {!teachers?.length && <p className="text-center text-slate-400 md:col-span-4">Faculty list will be updated soon.</p>}
        </div>
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
      <section className="relative py-20 sm:py-28">
        <div className="page-wrap">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="mb-3 text-xs font-bold uppercase text-primary-700">A glimpse of daily life</p>
            <h2 className="section-title">Gallery</h2>
          </div>
          <Link href="/gallery" className="text-sm font-semibold text-primary-600 hover:underline">View all →</Link>
        </div>
        <div className="mt-8 grid auto-rows-[150px] grid-cols-2 gap-3 sm:auto-rows-[190px] sm:gap-4 md:grid-cols-4">
          {gallery.map((g, index) => (
            <figure key={g.name} className={`group relative overflow-hidden rounded-2xl bg-slate-200 shadow-lg shadow-slate-900/10 ${index === 0 ? "row-span-2 md:col-span-2" : index === 3 ? "md:col-span-2" : ""}`}>
              <img src={g.url} alt={g.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent px-4 pb-4 pt-10 text-sm font-semibold text-white">{g.title}</figcaption>
            </figure>
          ))}
        </div>
        </div>
      </section>

      {/* EVENTS */}
      {!!events?.length && (
        <section className="relative overflow-hidden bg-primary-50/60 py-20 sm:py-24">
          <div className="page-wrap">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div><p className="mb-3 text-xs font-bold uppercase text-primary-700">Mark your calendar</p><h2 className="section-title">Upcoming Events</h2></div>
              <span className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm">School life, together</span>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {events.map((e) => (
                <article key={e.id} className="home-lift flex gap-4 rounded-2xl border border-white bg-white p-5 shadow-lg shadow-primary-900/5 transition hover:-translate-y-1 hover:shadow-xl">
                  <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-primary-700 text-white shadow-lg shadow-primary-900/20">
                    <span className="text-lg font-bold leading-none">{new Date(e.event_date).getDate()}</span>
                    <span className="text-[10px] uppercase">{new Date(e.event_date).toLocaleString("en-US", { month: "short" })}</span>
                  </div>
                  <div>
                    <div className="font-display text-lg font-bold text-slate-900">{e.title}</div>
                    <p className="text-sm text-slate-500 line-clamp-2">{e.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ADMISSIONS */}
      <section id="admissions" className="relative isolate overflow-hidden py-20 sm:py-28">
        <div className="absolute inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-primary-700 via-primary-800 to-primary-950 sm:inset-x-8" />
        <div className="absolute right-[10%] top-8 -z-10 hidden h-36 w-36 rotate-12 rounded-[2rem] border border-white/20 lg:block" />
        <div className="page-wrap grid gap-10 py-8 text-white lg:grid-cols-[.85fr_1.15fr] lg:items-center">
          <div className="px-3 sm:px-6">
            <p className="mb-3 text-xs font-bold uppercase text-primary-200">Your next chapter</p>
            <h2 className="font-display text-4xl font-bold leading-tight sm:text-5xl">Admissions {s.admission_enabled === false ? "Information" : "Open"}</h2>
            <p className="mt-4 max-w-md leading-relaxed text-white/75">Give your child the gift of quality education.</p>
            <Link href={s.admission_enabled === false ? "/downloads" : "/admissions"} className="btn mt-7 bg-white px-6 py-3 font-semibold text-primary-800 shadow-lg hover:-translate-y-0.5 hover:bg-primary-50">
              {s.admission_enabled === false ? "View Documents" : "Explore Admissions"}
            </Link>
          </div>
          <div className="home-reveal rounded-2xl border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-md sm:p-8">
            <h3 className="font-display text-2xl font-bold">How to Apply</h3>
            <p className="mt-4 leading-relaxed text-white/80">{s.admission_info}</p>
            <div className="mt-6 rounded-xl border border-white/15 bg-slate-950/20 p-4 text-sm text-white/90">
              Contact the school office at <b>{contact.phone || "the number listed in Contact Us"}</b> for enquiries.
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT + MAP */}
      <section id="contact" className="relative overflow-hidden bg-slate-950 py-20 text-white sm:py-24">
        <div className="absolute left-[8%] top-10 hidden h-20 w-20 rotate-12 rounded-2xl border border-white/10 md:block" />
        <div className="page-wrap relative grid gap-10 md:grid-cols-[.8fr_1.2fr] md:items-center">
          <div>
            <p className="mb-3 text-xs font-bold uppercase text-primary-200">We’re here to help</p>
            <h2 className="font-display text-4xl font-bold sm:text-5xl">Contact Us</h2>
            <div className="mt-7 space-y-4 text-white/80">
              <p className="flex gap-3"><span aria-hidden="true">📍</span>{contact.address}</p>
              <p className="flex gap-3"><span aria-hidden="true">📞</span>{contact.phone}</p>
              <p className="flex gap-3"><span aria-hidden="true">✉️</span>{contact.email}</p>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-white/15 bg-white/5 p-2 shadow-2xl shadow-black/30">
            <iframe src={contact.map_embed} width="100%" height="320" style={{ border: 0 }} loading="lazy" title="School map" />
          </div>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
