# 🏫 School Management System (Next.js + Supabase)

Premium school website + Principal admin panel + permission-based Teacher/Staff admin + Student portal.
Single school, single Supabase project. The Principal is the Super Admin.

## Features
- **Public website** — hero, about/vision/mission, principal message, facilities, faculty, achievements, events, notices, gallery, admissions, downloads, contact + Google Maps (all CMS-editable)
- **Auth** — username + password login, no public registration, no OTP
- **Roles** — super_admin (Principal), teacher, staff, student; granular permissions enforced via Postgres RLS (server-side, not just hidden buttons)
- **Accounts** — Principal creates Teacher/Staff; authorized admins create Students; reset passwords, deactivate/reactivate, delete
- **Fees** — monthly ledger per student, totals auto-calculated, students submit payment proofs (method/ref/screenshot), admins approve → receipt auto-generated, or reject. Gateway-ready architecture, no gateway required
- **Salaries** — teacher salary records, paid/pending, printable slips
- **Academics** — attendance, leave, homework, study materials, timetable, exams & results
- **Content** — notices, documents/downloads, gallery, events, achievements, full Website CMS, reports

## Setup (5 minutes)

### 1. Supabase
1. Create a project at supabase.com
2. Open **SQL Editor** → run `supabase/schema.sql`, then `supabase/seed.sql`
3. **Authentication → Users → Add user** → create the Principal:
   - Email: `principal@yourschool.edu` (any email — the username is what users type)
   - Password: strong password, tick "Auto confirm"
4. Run this to make the account Super Admin (or update + run the last query of seed.sql):
   ```sql
   update profiles set role = 'super_admin'
   where id = (select id from auth.users where email = 'principal@yourschool.edu');
   ```
5. **Settings → API** → copy URL, anon key, service_role key

### 2. App
```bash
cp .env.example .env.local   # fill in your Supabase keys
npm install
npm run dev
```
Login at `/login` with username `principal` (the email's local part) and your password → you land in `/admin`.

### 3. Vercel deploy
Push to GitHub → vercel.com → Import repo → add the same env vars → Deploy.

## How accounts work
- Users log in with a **username**; the app converts it to `<username>@school.local` for Supabase Auth (set `USERNAME_DOMAIN` in env).
- Creating accounts uses the **service-role key only on the server** (never exposed to the browser).
- Permissions live in `profiles.permissions` (JSONB array). RLS helper `has_permission(key)` guards every table. Teachers/Staff can never edit their own permissions — only the Principal can, via `/admin/roles`.

## Architecture notes
- `src/lib/supabase/server.ts` — cookie-based SSR client (RLS enforced)
- `src/lib/supabase/admin.ts` — service-role client for account creation (server actions only)
- `src/lib/actions/*` — server actions; every action re-checks role/permission server-side
- Future payment gateway: replace `submitPaymentProof` with a webhook that inserts into `payment_proofs` (or directly `fee_records` + `receipts`) — the approve/receipt flow already fits.
