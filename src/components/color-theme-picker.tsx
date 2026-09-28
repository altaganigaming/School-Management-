"use client";

import { useState } from "react";

const THEMES = [
  { name: "Ocean", primary: "#274CE4", accent: "#F59E0B" },
  { name: "Forest", primary: "#19704D", accent: "#D9485F" },
  { name: "Coral", primary: "#C2415D", accent: "#087E8B" },
  { name: "Citrus", primary: "#C26516", accent: "#2563EB" },
  { name: "Lagoon", primary: "#0E7490", accent: "#A34C20" },
  { name: "Graphite", primary: "#475569", accent: "#0F9D78" },
  { name: "Plum", primary: "#7545A8", accent: "#DB6C35" },
];

export function ColorThemePicker({ initialPrimary, initialAccent }: { initialPrimary: string; initialAccent: string }) {
  const [primary, setPrimary] = useState(initialPrimary);
  const [accent, setAccent] = useState(initialAccent);
  const selected = THEMES.find((theme) => theme.primary.toLowerCase() === primary.toLowerCase() && theme.accent.toLowerCase() === accent.toLowerCase());

  function chooseTheme(theme: (typeof THEMES)[number]) {
    setPrimary(theme.primary);
    setAccent(theme.accent);
  }

  function chooseCustomColor(value: string) {
    setPrimary(value.toUpperCase());
    setAccent(THEMES.find((theme) => theme.name === selected?.name)?.accent || accent);
  }

  return (
    <div className="space-y-4">
      <input type="hidden" name="key" value="primary_color" />
      <input type="hidden" name="value:primary_color" value={primary} />
      <input type="hidden" name="key" value="accent_color" />
      <input type="hidden" name="value:accent_color" value={accent} />
      <fieldset>
        <legend className="label">Color templates</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {THEMES.map((theme) => (
            <button key={theme.name} type="button" aria-pressed={selected?.name === theme.name} onClick={() => chooseTheme(theme)} className={`flex items-center gap-2 rounded-lg border p-2 text-sm transition ${selected?.name === theme.name ? "border-primary-600 bg-primary-50 ring-1 ring-primary-500" : "border-slate-200 hover:bg-slate-50"}`}>
              <span className="flex h-6 w-10 overflow-hidden rounded-full ring-1 ring-black/10"><span className="w-1/2" style={{ backgroundColor: theme.primary }} /><span className="w-1/2" style={{ backgroundColor: theme.accent }} /></span>
              {theme.name}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="flex flex-wrap items-center gap-3 text-sm">
        <span className="label mb-0">Custom primary hex</span>
        <input type="color" value={primary} onChange={(event) => chooseCustomColor(event.target.value)} className="h-10 w-14 cursor-pointer rounded border border-slate-300 bg-white p-1" />
        <span className="font-mono text-xs text-slate-600">{primary.toUpperCase()}</span>
      </label>
    </div>
  );
}
