import type { Metadata } from "next";
import { getSettings } from "@/lib/auth";
import "./globals.css";

const PRIMARY_STEPS = [
  [50, 0.94], [100, 0.88], [200, 0.72], [300, 0.52], [400, 0.28],
  [500, 0.1], [600, 0], [700, -0.15], [800, -0.3], [900, -0.45], [950, -0.62],
] as const;

function hexChannels(hex: string) {
  const value = hex.replace("#", "");
  return [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16));
}

function mixChannels(color: number[], amount: number) {
  const target = amount > 0 ? 255 : 0;
  return color.map((channel) => Math.round(channel + (target - channel) * Math.abs(amount))).join(" ");
}

function themeVariables(primary: string, accent: string) {
  const primaryChannels = hexChannels(primary);
  const accentChannels = hexChannels(accent);
  const variables: Record<string, string> = { "--primary": primary, "--accent": accent };
  for (const [shade, amount] of PRIMARY_STEPS) {
    variables[`--primary-${shade}`] = mixChannels(primaryChannels, amount);
  }
  variables["--accent-400"] = mixChannels(accentChannels, 0.12);
  variables["--accent-500"] = mixChannels(accentChannels, 0);
  variables["--accent-600"] = mixChannels(accentChannels, -0.14);
  return variables as React.CSSProperties;
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const schoolName = settings.school_name || "Sunrise Public School";
  return {
    title: { default: schoolName, template: `%s | ${schoolName}` },
    description: "Premium school website and management system.",
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return layoutWithTheme(children);
}

async function layoutWithTheme(children: React.ReactNode) {
  const settings = await getSettings();
  const primary = typeof settings.primary_color === "string" && /^#[0-9a-f]{6}$/i.test(settings.primary_color) ? settings.primary_color : "#274CE4";
  const accent = typeof settings.accent_color === "string" && /^#[0-9a-f]{6}$/i.test(settings.accent_color) ? settings.accent_color : "#F59E0B";
  return (
    <html lang="en">
      <body style={themeVariables(primary, accent)}>{children}</body>
    </html>
  );
}
