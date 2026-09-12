export type Role = "super_admin" | "teacher" | "staff" | "student";

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Principal / Super Admin",
  teacher: "Teacher",
  staff: "Staff",
  student: "Student",
};

export const PERMISSIONS: { key: string; label: string; group: string }[] = [
  { key: "manage_students", label: "View / Manage Students", group: "People" },
  { key: "create_student_accounts", label: "Create Student Accounts", group: "People" },
  { key: "reset_student_accounts", label: "Reset Student Accounts", group: "People" },
  { key: "manage_faculty", label: "Manage Faculty / Staff", group: "People" },
  { key: "manage_classes", label: "Manage Classes & Subjects", group: "Academics" },
  { key: "manage_attendance", label: "Manage Attendance", group: "Academics" },
  { key: "manage_leave", label: "Manage Leave Requests", group: "Academics" },
  { key: "manage_homework", label: "Manage Homework", group: "Academics" },
  { key: "manage_materials", label: "Manage Study Materials", group: "Academics" },
  { key: "manage_timetable", label: "Manage Timetable", group: "Academics" },
  { key: "manage_exams", label: "Manage Exams & Results", group: "Academics" },
  { key: "manage_fees", label: "Manage Fees", group: "Finance" },
  { key: "verify_payments", label: "Verify Payment Proofs & Issue Receipts", group: "Finance" },
  { key: "manage_salaries", label: "Manage Salaries", group: "Finance" },
  { key: "manage_notices", label: "Manage Notices / News", group: "Content" },
  { key: "manage_documents", label: "Manage Documents & Downloads", group: "Content" },
  { key: "manage_website", label: "Manage Website (CMS)", group: "Content" },
  { key: "manage_gallery", label: "Manage Gallery", group: "Content" },
  { key: "manage_events", label: "Manage Events", group: "Content" },
  { key: "manage_achievements", label: "Manage Achievements", group: "Content" },
];

export function hasPerm(role: Role, permissions: string[] | null, key: string): boolean {
  if (role === "super_admin") return true;
  if (!permissions) return false;
  return permissions.includes(key);
}

export interface NavModule { href: string; label: string; icon: string; perm: string | null; superOnly?: boolean }

export const ADMIN_MODULES: NavModule[] = [
  { href: "/admin", label: "Dashboard", icon: "▦", perm: null },
  { href: "/admin/students", label: "Students", icon: "🎓", perm: "manage_students" },
  { href: "/admin/teachers", label: "Teachers", icon: "👩‍🏫", perm: "manage_faculty" },
  { href: "/admin/staff", label: "Staff", icon: "🗂️", perm: "manage_faculty" },
  { href: "/admin/classes", label: "Classes & Subjects", icon: "🏫", perm: "manage_classes" },
  { href: "/admin/attendance", label: "Attendance", icon: "✅", perm: "manage_attendance" },
  { href: "/admin/leave", label: "Leave", icon: "🌴", perm: "manage_leave" },
  { href: "/admin/fees", label: "Fees", icon: "💰", perm: "manage_fees" },
  { href: "/admin/payment-proofs", label: "Payment Proofs", icon: "🧾", perm: "verify_payments" },
  { href: "/admin/salaries", label: "Salaries", icon: "💵", perm: "manage_salaries" },
  { href: "/admin/homework", label: "Homework", icon: "📚", perm: "manage_homework" },
  { href: "/admin/materials", label: "Study Materials", icon: "📖", perm: "manage_materials" },
  { href: "/admin/timetable", label: "Timetable", icon: "🗓️", perm: "manage_timetable" },
  { href: "/admin/exams", label: "Exams & Results", icon: "📝", perm: "manage_exams" },
  { href: "/admin/notices", label: "Notices / News", icon: "📢", perm: "manage_notices" },
  { href: "/admin/documents", label: "Documents", icon: "📄", perm: "manage_documents" },
  { href: "/admin/website", label: "Website CMS", icon: "🌐", perm: "manage_website" },
  { href: "/admin/gallery", label: "Gallery", icon: "🖼️", perm: "manage_gallery" },
  { href: "/admin/events", label: "Events", icon: "🎉", perm: "manage_events" },
  { href: "/admin/achievements", label: "Achievements", icon: "🏆", perm: "manage_achievements" },
  { href: "/admin/reports", label: "Reports", icon: "📊", perm: "manage_fees" },
  { href: "/admin/users", label: "Users & Accounts", icon: "👥", perm: null, superOnly: true },
  { href: "/admin/roles", label: "Roles & Permissions", icon: "🔐", perm: null, superOnly: true },
  { href: "/admin/settings", label: "School Settings", icon: "⚙️", perm: null, superOnly: true },
];
