"use client";

import { useState } from "react";

export interface FacilityEntry {
  name: string;
  image_url: string | null;
}

export function FacilitiesEditor({ initialFacilities }: { initialFacilities: FacilityEntry[] }) {
  const [rows, setRows] = useState(() => initialFacilities.map((facility, index) => ({
    key: `facility-${index}`,
    name: facility.name,
    image_url: facility.image_url,
  })));

  return (
    <div className="card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="card-title">Facilities</h2>
          <p className="mt-1 text-xs text-slate-500">Each photo fills its facility card. Recommended: 1200 × 900 px (4:3), up to 5 MB.</p>
        </div>
        <button type="button" className="btn-secondary btn-sm" onClick={() => setRows((current) => [
          ...current,
          { key: `facility-${Date.now()}-${Math.random()}`, name: "", image_url: null },
        ])}>Add facility</button>
      </div>
      <input type="hidden" name="key" value="facilities" />
      <div className="divide-y divide-slate-200">
        {rows.map((facility, index) => (
          <div key={facility.key} className="grid gap-3 py-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="block"><span className="label">Facility name</span>
              <input name="facility_name" className="input" value={facility.name} maxLength={100} required
                onChange={(event) => setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, name: event.target.value } : row))} />
            </label>
            <div className="block">
              <span className="label">Background photo</span>
              <input name="facility_image" type="file" accept="image/*" className="input" />
              <input type="hidden" name="facility_existing_image" value={facility.image_url || ""} />
              {facility.image_url && <label className="mt-2 flex items-center gap-2 text-xs text-red-600">
                <input type="checkbox" name={`facility_remove_image:${index}`} value="true" className="h-4 w-4" />Remove current photo
              </label>}
            </div>
            <button type="button" className="btn-danger btn-sm" onClick={() => setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))}>Remove facility</button>
          </div>
        ))}
        {!rows.length && <p className="py-5 text-sm text-slate-500">No facilities configured.</p>}
      </div>
    </div>
  );
}