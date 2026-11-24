# Glight Tech Mentors

Website for **Glight International Consult Limited**, branded **Glight Tech Mentors**.

- **Brand:** Education. Innovation. Technology.
- **Tagline:** Tech Mentor Your Child for the Future.
- **Motto:** Learn. Build. Grow. Innovate. Shine.
- **Official site:** <https://glight-international-consult.vercel.app>

## Project architecture

The public website is a dependency-free, multi-page HTML/CSS/JavaScript site. Shared navigation, footer, announcements and form interactions live in `assets/js/script.js`; page content and SEO metadata live in the root HTML pages. Images, including Glight's supplied logo, are local to `assets/images`.

Vercel serves the static pages and Node.js serverless functions in `api/`. The functions use Supabase Auth and PostgREST over server-side `fetch`; no database or auth secret is included in browser code. `supabase/schema.sql` creates the registration tables, access controls and rate-limit function. There is no frontend framework, package installation or build step.

GitHub is the source repository; Vercel is required to run the API functions. GitHub Pages alone cannot provide the secure registration API or admin dashboard.

## Pages

- Home: `index.html`
- About: `about.html`
- Coding & Robotics: `coding-robotics.html`
- STEM Programmes: `stem-programmes.html`
- School Partnerships: `school-partnerships.html`
- IT Solutions: `it-solutions.html`
- Training & Workshops: `training-workshops.html`
- Contact: `contact.html`
- Online Student Registration: `register.html`
- Privacy Notice: `privacy.html`
- Admin sign-in and dashboard: `admin.html`

Testimonials are deliberately not fabricated. The homepage identifies that approved testimonials are not available yet. Announcements are edited in `assets/data/announcements.json`; use an array of objects with `title` and `summary`, and optional ISO `date` and `url` properties. Content is rendered as text, not executable HTML.

## Student registration and privacy

The registration form is for a parent or legal guardian. It collects the guardian's name and contact details, student name, age, class, programme interest and preferred learning mode. A server-side validation check enforces age 4–18, a listed programme, physical/online delivery and recorded guardian consent. The API returns a unique `GL-YYYY-...` reference and does not return the student's submitted information.

Student data is stored in Supabase and is not readable by anonymous or authenticated browser clients. The server-only service role key is used by the Vercel functions. Admin sign-in uses Supabase Auth; a user's `app_metadata.role` must be set to `admin`. Admin session cookies are `HttpOnly`, `SameSite=Strict`, and `Secure` in production.

Registration requests are rate limited to five per IP digest per 15-minute window. The raw client IP is not saved in the student registration record; old keyed digests are removed during registration requests and by a daily Vercel Cron task. Before accepting live child registrations, Glight must choose and verify an appropriate Supabase data-hosting region, approve a student-record retention schedule, and review the privacy notice and consent language against applicable privacy requirements. The privacy notice flags these decisions rather than making unsupported legal or data-retention claims.

## Supabase setup

1. Create a Supabase project and choose its data-hosting region based on Glight's privacy and operational requirements.
2. Open the Supabase SQL Editor and run `supabase/schema.sql`.
3. Create an administrator in Supabase Authentication. Give the account `app_metadata` containing `"role": "admin"` (not user-editable `user_metadata`). For example, after replacing the email with the chosen administrator's address, run this in the SQL Editor:

   ```sql
   update auth.users
   set raw_app_meta_data =
     coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
   where email = 'admin@example.com';
   ```

4. Copy `.env.example` as a reference only. Set the following in Vercel Project Settings → Environment Variables for the environments you use:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` — server-side only; never use a `NEXT_PUBLIC_` prefix or add the value to Git.
   - `RATE_LIMIT_SECRET` — a random secret of at least 32 characters.
   - `CRON_SECRET` — a different random secret of at least 32 characters, used by the scheduled cleanup endpoint.
   - `PUBLIC_SITE_URL` — the official production origin, `https://glight-international-consult.vercel.app`.

   Generate secrets locally with Node.js, for example:

   ```powershell
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

   Run it separately for each secret. Do not paste secrets into source files, issues, or chat.

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

The tests use mocked Supabase responses and do not require live credentials or create real student records.

## Contact

- WhatsApp: [07067426404](https://wa.me/2347067426404)
- Phone: [08025675876](tel:08025675876)
- Email: [glightinternationalconsult@gmail.com](mailto:glightinternationalconsult@gmail.com)
- Instagram: [@glight_tech](https://www.instagram.com/glight_tech/)
- Facebook: Glight Tech Mentor
