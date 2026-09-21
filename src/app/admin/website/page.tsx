import { requireAdmin, getSettings } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { saveSettings } from "@/lib/actions/accounts";

export const dynamic = "force-dynamic";

const TEXT_FIELDS = [
  ["school_name", "School Name"], ["tagline", "Tagline"],
  ["about", "About Text"],
  ["vision", "Vision"], ["mission", "Mission"], ["principal_message", "Principal's Message (HTML allowed)"],
  ["admission_info", "Admission Information"],
];
const MEDIA_FIELDS = [["logo_url", "Logo"], ["hero_image", "Hero Background Image"], ["favicon_url", "Favicon"]];
const CONTACT_FIELDS = [
  ["address", "Address"], ["phone", "Phone"], ["email", "Email"], ["map_embed", "Google Maps Embed URL"],
];

export default async function WebsiteCMSPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireAdmin("manage_website");
  const sp = await searchParams;
  const s = await getSettings();
  const contact = s.contact || {};

  return (
    <>
      <PageHeader title="Website CMS" subtitle="Edit the public website without touching code. Changes go live instantly." />
      {sp.saved && <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 ring-1 ring-emerald-200">Website updated.</div>}

      <form action={saveSettings} className="space-y-6">
        <div className="card">
          <h2 className="card-title mb-4">Identity & Content</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {TEXT_FIELDS.map(([key, label]) => (
              <label key={key} className={key === "about" || key === "principal_message" || key === "admission_info" ? "block md:col-span-2" : "block"}>
                <span className="label">{label}</span>
                <input type="hidden" name="key" value={key} />
                {(key === "about" || key === "principal_message" || key === "admission_info" || key === "vision" || key === "mission") ? (
                  <textarea name={`value:${key}`} className="input" rows={key === "principal_message" ? 4 : 3}
                    defaultValue={typeof s[key] === "string" ? s[key] : JSON.stringify(s[key] ?? "")} />
                ) : (
                  <input name={`value:${key}`} className="input" defaultValue={s[key] ?? ""} />
                )}
              </label>
            ))}
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {MEDIA_FIELDS.map(([key, label]) => (
              <label key={key} className="block">
                <span className="label">{label} (choose file)</span>
                <input type="file" name={`file:${key}`} accept={key === "favicon_url" ? "image/png,image/x-icon,image/svg+xml" : "image/*"} className="input" />
                <input name={`value:${key}`} className="input mt-2" placeholder="Or paste image URL" defaultValue={s[key] ?? ""} />
                <input type="hidden" name="key" value={key} />
              </label>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="card-title mb-4">Contact & Location</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {CONTACT_FIELDS.map(([key, label]) => (
              <label key={key} className="block">
                <span className="label">{label}</span>
                <input type="hidden" name="key" value={`contact.${key}`} />
                <input name={`value:contact.${key}`} className="input" defaultValue={contact[key] ?? ""} />
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-400">Contact fields are saved individually into the contact settings group.</p>
        </div>

        <div className="card">
          <h2 className="card-title mb-4">Facilities (one per line)</h2>
          <input type="hidden" name="key" value="facilities" />
          <textarea name="value:facilities" className="input" rows={5}
            defaultValue={Array.isArray(s.facilities) ? s.facilities.join("\n") : ""} />
          <p className="mt-2 text-xs text-slate-400">Tip: facilities typed one-per-line are converted to a list automatically.</p>
        </div>

        <button className="btn-primary px-8">Save Website</button>
      </form>
    </>
  );
}
