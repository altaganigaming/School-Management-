import { requireAdmin, getSettings } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { saveSettings } from "@/lib/actions/accounts";
import { ColorThemePicker } from "@/components/color-theme-picker";
import { FacilitiesEditor } from "@/components/facilities-editor";

export const dynamic = "force-dynamic";

const TEXT_FIELDS = [
  ["school_name", "School Name / Homepage H1"], ["tagline", "Tagline"],
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
  const facilityEntries = Array.isArray(s.facilities) ? s.facilities.map((facility: unknown) =>
    typeof facility === "string"
      ? { name: facility, image_url: null }
      : { name: String((facility as { name?: unknown })?.name || ""), image_url: String((facility as { image_url?: unknown })?.image_url || "") || null }
  ).filter((facility: { name: string }) => facility.name.trim()) : [];
  const primaryColor = typeof s.primary_color === "string" && /^#[0-9a-f]{6}$/i.test(s.primary_color) ? s.primary_color : "#274CE4";
  const accentColor = typeof s.accent_color === "string" && /^#[0-9a-f]{6}$/i.test(s.accent_color) ? s.accent_color : "#F59E0B";

  return (
    <>
      <PageHeader title="Website CMS" subtitle="Edit the public website without touching code. Changes go live instantly." />
      {sp.saved && <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 ring-1 ring-emerald-200">Website updated.</div>}
      {sp.error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{sp.error === "facility_image" ? "Facility photo upload failed. Use an image up to 5 MB." : "Website update failed. Please try again."}</div>}

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
                {s[key] && <label className="mt-2 flex items-center gap-2 text-xs text-red-600"><input type="checkbox" name={`remove:${key}`} value="true" className="h-4 w-4" />Remove current image</label>}
              </label>
            ))}
          </div>
          <label className="mt-6 flex items-center gap-3 rounded-lg bg-primary-50 p-4 text-sm text-primary-900">
            <input type="hidden" name="key" value="admission_enabled" />
            <input type="hidden" name="value:admission_enabled" value="false" />
            <input type="checkbox" name="value:admission_enabled" value="true" defaultChecked={s.admission_enabled !== false} className="h-5 w-5" />
            <span><b>Online admissions enabled</b><br /><span className="text-xs text-primary-700">Show the application form on the home page.</span></span>
          </label>
        </div>

        <div className="card">
          <h2 className="card-title mb-2">Website Color Theme</h2>
          <p className="mb-4 text-sm text-slate-500">Choose a matched palette or set a custom primary hex color.</p>
          <ColorThemePicker initialPrimary={primaryColor} initialAccent={accentColor} />
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

        <FacilitiesEditor initialFacilities={facilityEntries} />

        <button className="btn-primary px-8">Save Website</button>
      </form>
    </>
  );
}
