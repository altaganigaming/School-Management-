import type { Metadata } from "next";
import { getSettings } from "@/lib/auth";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const schoolName = settings.school_name || "Sunrise Public School";
  return {
    title: { default: schoolName, template: `%s | ${schoolName}` },
    description: "Premium school website and management system.",
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
