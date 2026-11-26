# Glight Tech Mentors

Website for **Glight International Consult Limited**, branded **Glight Tech Mentors**.

- **Brand:** Education. Innovation. Technology.
- **Tagline:** Tech Mentor Your Child for the Future.
- **Motto:** Learn. Build. Grow. Innovate. Shine.
- **Official site:** <https://glight-international-consult.vercel.app>

## Project architecture

The public website is a dependency-free, multi-page HTML/CSS/JavaScript site. Shared navigation, footer, announcements and form interactions live in `assets/js/script.js`; page content and SEO metadata live in the root HTML pages. Images, including Glight's supplied logo and learning photos, are local to `assets/images`; supplied videos are local to `assets/videos`.

Vercel serves the static pages and Node.js serverless functions in `api/`. The functions use Supabase Auth and PostgREST over server-side `fetch`; no database or auth secret is included in browser code. `supabase/schema.sql` creates the registration tables, access controls and rate-limit function. There is no frontend framework, package installation or build step.

GitHub is the source repository; Vercel is required to run the API functions. GitHub Pages alone cannot provide the secure registration API or admin dashboard.

## Pages

- Home: `index.html`
- About: `about.html`
- Coding & Robotics: `coding-robotics.html`
- School Partnerships: `school-partnerships.html`
- IT Solutions: `it-solutions.html`
- Training & Workshops: `training-workshops.html`
- Contact: `contact.html`
- Online Student Registration: `register.html`
- Privacy Notice: `privacy.html`
- Admin sign-in and dashboard: `admin.html`

Testimonials are deliberately not fabricated. The homepage identifies that approved testimonials are not available yet. Announcements are edited in `assets/data/announcements.json`; use an array of objects with `title` and `summary`, and optional ISO `date` and `url` properties. Content is rendered as text, not executable HTML.

## Student registration and privacy

The registration form is for a parent or legal guardian. It collects the guardian's contact details, student name, age, class, programme interest, physical/online learning mode, parental consent and optional additional information. Server-side validation enforces age 3–18, a listed programme, learning mode and consent. Undergraduates and graduates seeking specialist IT skills can contact Glight directly. The API returns a unique `GL-YYYY-...` reference and does not return the student's submitted information.

Student data is stored in the `student_registrations` table and is not readable by anonymous or authenticated browser clients. RLS is enabled and direct client access is revoked; the server-only service role key is used only by Vercel functions. When Google Sheets is configured, the API also appends a copy to the configured spreadsheet using server-side credentials. Keep that sheet restricted to staff who need access. Admin sign-in uses Supabase Auth; a user's `app_metadata.role` must be set to `admin`. Admin session cookies are `HttpOnly`, `SameSite=Strict`, and `Secure` in production. The dashboard supports search, programme/mode/status filters, pagination, status updates, authorised deletion, CSV export and registration totals.

Registration notifications use Resend from the server. When configured, the API emails a reference-only alert to Glight and a confirmation to the parent/guardian. Google Sheets and email failures are logged separately; a registration already saved in Supabase remains successful, and the form reports when either copy or notification could not be confirmed. Do not resubmit solely to retry either service.

Registration requests are rate limited to five per IP digest per 15-minute window. The raw client IP is not saved in the student registration record; old keyed digests are removed during registration requests and by a daily Vercel Cron task. Before accepting live child registrations, Glight must choose and verify an appropriate Supabase data-hosting region, approve a student-record retention schedule, and review the privacy notice and consent language against applicable privacy requirements. The privacy notice flags these decisions rather than making unsupported legal or data-retention claims.

## Supabase setup

1. Create a Supabase project and choose its data-hosting region based on Glight's privacy and operational requirements.
2. Open the Supabase SQL Editor and run `supabase/schema.sql`. Rerun the updated schema on existing projects to migrate registration fields, enforce the learner age range of 3–18 and apply the current registration programme options. The migration preserves existing records and legacy application statuses; the retired `STEM Education` value remains in the database constraint for legacy compatibility, while the public registration API rejects it for new submissions.
3. Create an administrator in Supabase Authentication. Give the account `app_metadata` containing `"role": "admin"` (not user-editable `user_metadata`). For example, after replacing the email with the chosen administrator's address, run this in the SQL Editor:

   ```sql
   update auth.users
   set raw_app_meta_data =
     coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
   where email = 'admin@example.com';
   ```

4. Copy `.env.example` as a reference only. Set the following in Vercel Project Settings → Environment Variables for the environments you use:
   - `SUPABASE_URL` — the project root URL, such as `https://your-project.supabase.co` (do not append `/rest/v1`).
   - `SUPABASE_PUBLISHABLE_KEY` — the `sb_publishable_...` key from Supabase. It is used by the server API and is never embedded in frontend code.
   - `SUPABASE_SECRET_KEY` — the `sb_secret_...` key, server-side only; never add it to frontend code or Git. Existing deployments may continue using the legacy `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` names.
   - `RATE_LIMIT_SECRET` — a random secret of at least 32 characters.
   - `CRON_SECRET` — a different random secret of at least 32 characters, used by the scheduled cleanup endpoint.
   - `PUBLIC_SITE_URL` — the official production origin, `https://glight-international-consult.vercel.app`.
   - `RESEND_API_KEY` — secret API key from Resend; server-side only.
   - `EMAIL_FROM` — sender address on a domain verified with Resend.
   - `REGISTRATION_NOTIFICATION_EMAIL` — the Glight inbox for new-registration alerts.
   - `GOOGLE_SHEETS_SPREADSHEET_ID` — the ID from the Google Sheet URL.
   - `GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL` — the service account email granted access to the sheet.
   - `GOOGLE_SHEETS_PRIVATE_KEY` — the service account private key; server-side only.
   - `GOOGLE_SHEETS_RANGE` — append range, such as `Registrations!A:M`.

   Generate secrets locally with Node.js, for example:

   ```powershell
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

   Run it separately for each secret. Do not paste secrets into source files, issues, or chat. Add the values to an ignored local `.env.local` for Vercel CLI testing and to Vercel Project Settings → Environment Variables for deployment.

5. In Supabase, find the publishable and secret keys under Project Settings → API Keys. Add the publishable key as `SUPABASE_PUBLISHABLE_KEY`; add the secret key as `SUPABASE_SECRET_KEY` directly in Vercel and the ignored local `.env.local`, never in this chat or source code.
6. In Resend, verify the domain used by `EMAIL_FROM`, then add the three email settings above to Vercel and your ignored local `.env.local` file. Until email is configured, registrations still save securely and the form displays that automatic email is unavailable.
7. To enable the Google Sheets copy, enable the Google Sheets API in Google Cloud, create a service account, and add its email as an editor on a dedicated, access-restricted spreadsheet. Create a tab named `Registrations` with these headers in columns A–M: `Reference`, `Received At (UTC)`, `Parent/Guardian Name`, `Parent/Guardian Email`, `Parent/Guardian Phone`, `Student Name`, `Age`, `Class/Year`, `Programme`, `Learning Mode`, `Additional Information`, `Guardian Consent`, `Status`. Set the four Google Sheets variables above in Vercel. Store the service account key only in Vercel or an ignored `.env.local`; never commit it or paste it into chat. If Google Sheets is not configured, registration continues to save in Supabase and the form reports that the spreadsheet copy is unavailable.

## Vercel deployment

1. Connect the existing GitHub repository to a Vercel project. Keep the framework preset as **Other** and do not configure a build command or output directory.
2. Add the Supabase and application environment variables above. Set `PUBLIC_SITE_URL` to the official site origin. Vercel's `VERCEL_URL` is also allowed for preview deployments.
3. Deploy through Vercel. The root HTML files are served as static pages; files under `api/` are deployed as serverless functions. `vercel.json` adds security headers and a daily cleanup cron.
4. In Vercel, verify that Cron Jobs are enabled for the project and that `CRON_SECRET` is present in the Production environment.
5. Test the public registration and sign in at `admin.html`. Use an administrator account whose app metadata has the required role.

For local function testing, use the Vercel CLI with the project's environment variables (`vercel dev`). A plain static server can preview the public pages but cannot submit registrations or access admin data.

## Verification

With Node.js 18 or newer, run the focused API and validation tests:

```powershell
node --test tests/registration.test.js
```

The tests use mocked Supabase, Google Sheets and Resend responses. They do not require live credentials or create real student records.

## Contact

- WhatsApp: [07067426404](https://wa.me/2347067426404)
- Phone: [08025675876](tel:08025675876)
- Email: [glightinternationalconsult@gmail.com](mailto:glightinternationalconsult@gmail.com)
- Instagram: [@glight_tech](https://www.instagram.com/glight_tech/)
- Facebook: Glight Tech Mentor
