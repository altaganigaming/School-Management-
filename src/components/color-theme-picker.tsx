"use client";

import { useState } from "react";

const THEMES = [
  { name: "Ocean", primary: "#155E75", accent: "#F4A261" },
  { name: "Forest", primary: "#176B4D", accent: "#DB4D65" },
  { name: "Coral", primary: "#C2415D", accent: "#087E8B" },
  { name: "Citrus", primary: "#C26516", accent: "#2563EB" },
  { name: "Lagoon", primary: "#0E7490", accent: "#D97706" },
  { name: "Royal", primary: "#1D4ED8", accent: "#F97316" },
  { name: "Meadow", primary: "#4D7C0F", accent: "#EA580C" },
  { name: "Ruby", primary: "#BE123C", accent: "#0F766E" },
];

export function ColorThemePicker({ initialPrimary, initialAccent }: { initialPrimary: string; initialAccent: string }) {
  const [primary, setPrimary] = useState(initialPrimary);
  const [accent, setAccent] = useState(initialAccent);
  const selected = THEMES.find((theme) => theme.primary.toLowerCase() === primary.toLowerCase() && theme.accent.toLowerCase() === accent.toLowerCase());

  function chooseTheme(theme: (typeof THEMES)[number]) {
    setPrimary(theme.primary);
    setAccent(theme.accent);
  }

  return (
    <div className="space-y-4">
      <input type="hidden" name="key" value="primary_color" />
      <input type="hidden" name="value:primary_color" value={primary} />
      <input type="hidden" name="key" value="accent_color" />
      <input type="hidden" name="value:accent_color" value={accent} />
      <fieldset>
        <legend className="label">Ready-made palettes</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {THEMES.map((theme) => (
            <button key={theme.name} type="button" aria-pressed={selected?.name === theme.name} onClick={() => chooseTheme(theme)} className={`flex items-center gap-2 rounded-lg border p-2 text-sm transition ${selected?.name === theme.name ? "border-primary-600 bg-primary-50 ring-1 ring-primary-500" : "border-slate-200 hover:bg-slate-50"}`}>
              <span className="flex h-6 w-10 overflow-hidden rounded-full ring-1 ring-black/10"><span className="w-1/2" style={{ backgroundColor: theme.primary }} /><span className="w-1/2" style={{ backgroundColor: theme.accent }} /></span>
              {theme.name}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap gap-x-8 gap-y-4">
        <label className="flex items-center gap-3 text-sm">
          <span className="label mb-0">Custom primary</span>
          <input type="color" value={primary} onChange={(event) => setPrimary(event.target.value.toUpperCase())} aria-label="Custom primary color" className="h-10 w-14 cursor-pointer rounded border border-slate-300 bg-white p-1" />
          <span className="font-mono text-xs text-slate-600">{primary.toUpperCase()}</span>
        </label>
        <label className="flex items-center gap-3 text-sm">
          <span className="label mb-0">Custom accent</span>
          <input type="color" value={accent} onChange={(event) => setAccent(event.target.value.toUpperCase())} aria-label="Custom accent color" className="h-10 w-14 cursor-pointer rounded border border-slate-300 bg-white p-1" />
          <span className="font-mono text-xs text-slate-600">{accent.toUpperCase()}</span>
        </label>
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <div className="h-3" style={{ background: `linear-gradient(90deg, ${primary} 0 68%, ${accent} 68%)` }} />
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-4">
          <span className="font-semibold text-slate-800">Homepage color preview</span>
          <span className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: primary }}>Explore Admissions</span>
          <span className="rounded-full px-3 py-1 text-xs font-semibold text-white" style={{ backgroundColor: accent }}>News</span>
        </div>
      </div>
    </div>
  );
}
