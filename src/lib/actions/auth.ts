"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { usernameToEmail } from "@/lib/utils";

export async function login(formData: FormData) {
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "");
  const supabase = await createClient();

  let email = username.includes("@") ? username.toLowerCase() : usernameToEmail(username);
  let { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error && !username.includes("@")) {
    const admin = createAdminClient();
    const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const userList = (users as { users?: Array<{ user_metadata?: { username?: string }; email?: string | null }> } | null)?.users ?? [];
    const match = userList.find((user) =>
      user.user_metadata?.username?.toLowerCase() === username.toLowerCase()
      || user.email?.split("@")[0].toLowerCase() === username.toLowerCase()
    );
    if (match?.email) {
      email = match.email;
      ({ data, error } = await supabase.auth.signInWithPassword({ email, password }));
    }
  }

  if (error || !data.user) redirect("/login?error=1");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", data.user.id)
    .single();

  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    redirect("/login?error=disabled");
  }
  const destination = next.startsWith("/admin") && profile.role !== "student"
    ? next
    : next.startsWith("/portal") && profile.role === "student"
      ? next
      : profile.role === "student" ? "/portal" : "/admin";
  redirect(destination);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
