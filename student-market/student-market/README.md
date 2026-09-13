# Student Market — setup guide

This app has three parts:
- **Admin dashboard** — manage the student list, invite companies, see results
- **Company portal** — companies log in and register students by student number
- **Login / invite emails** — handled automatically by Supabase

You do **not** need to write any code. Follow the steps below in order.

---

## 1. Create a Supabase project (free)

1. Go to [supabase.com](https://supabase.com) and sign up / log in.
2. Click **New project**. Pick any name and a database password (save it somewhere).
3. Wait ~2 minutes for it to finish setting up.

## 2. Create the database tables

1. In your Supabase project, open **SQL Editor** (left sidebar) → **New query**.
2. Open the file `supabase/schema.sql` from this project, copy all of it, and paste it into the editor.
3. Click **Run**. You should see "Success. No rows returned."

## 3. Turn on email invites

1. In Supabase, go to **Authentication → Providers**, make sure **Email** is enabled.
2. Go to **Authentication → URL Configuration**. You'll fill in the **Site URL** and **Redirect URLs** in step 6, after you know your app's web address — come back to this.
3. Optional but recommended: Supabase's default email sender is fine for testing, but has low limits. For a real event, go to **Project Settings → Auth → SMTP Settings** and connect a provider like Resend or Postmark's free tier so invite emails land reliably. This can be skipped to start.

## 4. Get your API keys

1. In Supabase, go to **Project Settings → API**.
2. You'll need three values for the next step:
   - **Project URL**
   - **anon public** key
   - **service_role** key (click "Reveal" — keep this one secret, never share it)

## 5. Deploy the app to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up / log in (GitHub login is easiest).
2. You'll need this project's code in a GitHub repository:
   - Easiest way: create a new empty repository on [github.com](https://github.com/new), then upload all the files from this project into it (GitHub lets you drag-and-drop files in the web UI, or use GitHub Desktop if you prefer).
3. In Vercel, click **Add New → Project**, and import that GitHub repository.
4. Before clicking Deploy, open **Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | your Project URL from step 4 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your anon public key from step 4 |
   | `SUPABASE_SERVICE_ROLE_KEY` | your service_role key from step 4 |
   | `NEXT_PUBLIC_SITE_URL` | leave blank for now, you'll set this in step 5b |

5. Click **Deploy**. Wait for it to finish, then copy the web address Vercel gives you (e.g. `https://student-market-yourname.vercel.app`).
   - **5b.** Go back to Vercel → your project → **Settings → Environment Variables**, edit `NEXT_PUBLIC_SITE_URL` to be that exact address, then go to **Deployments** and click **Redeploy** on the latest one.

## 6. Connect Supabase to your live web address

1. Back in Supabase → **Authentication → URL Configuration**:
   - **Site URL**: your Vercel address (e.g. `https://student-market-yourname.vercel.app`)
   - **Redirect URLs**: add `https://student-market-yourname.vercel.app/set-password`
2. Save.

## 7. Create your admin account

1. In Supabase, go to **Authentication → Users → Add user**.
2. Enter your own email and a password. Tick **Auto Confirm User**. Click Create.
3. Copy the new user's ID (a long code, shown in the users list).
4. Go to **SQL Editor → New query** and run (replacing the placeholders):

   ```sql
   insert into profiles (id, role, email)
   values ('paste-the-user-id-here', 'admin', 'your@email.com');
   ```

5. Go to your live app's address and log in with that email and password. You should land on the admin dashboard.

## 8. You're set

- Add your student list (one by one, or import a CSV: `student_number,name` per line) under **Students**.
- Invite each company under **Companies** — they'll get an email with a link to set their password and log in.
- On market day, companies log in on their phone/laptop and type in student numbers as they meet people. Watch results live under **Results**.

---

### Notes
- Each student can be registered by at most **2** companies — this is enforced automatically, even if two companies submit at the exact same moment.
- If invite emails aren't arriving, check spam first, then consider setting up SMTP (step 3.3) — Supabase's built-in sender is rate-limited and best for testing only.
- Everything here runs on free tiers (Supabase, Vercel) for an event of this size.
