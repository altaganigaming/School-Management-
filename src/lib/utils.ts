export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function formatCurrency(n: number | string | null) {
  const v = Number(n ?? 0);
  return "₹" + v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function monthLabel(month: string) {
  // "2026-04" -> "April 2026"
  const [y, m] = month.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleString("en-US", { month: "long", year: "numeric" });
}

export function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthOptions(from = "2025-04", count = 24) {
  const out: { value: string; label: string }[] = [];
  const [y, m] = from.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  for (let i = 0; i < count; i++) {
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    out.push({ value: val, label: monthLabel(val) });
    d.setMonth(d.getMonth() + 1);
  }
  return out;
}

export function usernameToEmail(username: string) {
  const domain = process.env.USERNAME_DOMAIN || "school.local";
  return `${username.trim().toLowerCase()}@${domain}`;
}
