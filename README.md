# B2B Hacks — Hyderabad 2026

Website source and Supabase registration backend for the six-hour B2B Hacks state-level hackathon at Nanospace, Nanakramguda, Hyderabad on October 31, 2026. Registration fee: ₹400; prize pool: ₹30,000.

Live site: [b2b-hacks-vjit-2026](https://b2b-hacks-vjit-2026.y4wjsz692k.chatgpt.site/)

## What is included

- The production static frontend at the repository root: `index.html`, `application.html`, `application-config.js`, `styles.css`, and every image/logo under `assets/`.
- The Supabase Edge Function source at `supabase/functions/submit-registration/`.
- All six database migrations from the linked Supabase project at `supabase/migrations/`.
- Supabase CLI project configuration at `supabase/config.toml`.

## Registration flow

The home page's **Apply Now** links to `application.html`. The application sends the team lead name, team name, phone, email, preferred track, team size, and additional member names to the `submit-registration` Edge Function. That function validates the request, rate-limits submissions, prevents duplicate lead emails, and writes registrations to `public.hackathon_registrations`.

The frontend's Supabase URL and public client credentials are in `application-config.js`. Those client values are designed to be public; database access is restricted by RLS and writes go through the Edge Function. The server-side Supabase key is never stored in this repository and must remain in the Supabase function environment.

The migration filenames and versions match the six migrations already recorded by the linked Supabase project as of 2026-10-03. This preserves the migration history when the repository is linked with the CLI.

## Run the frontend locally

From the repository root, use the bundled zero-dependency Node server (no install step):

```powershell
node server.js 4173
```

Open [http://localhost:4173](http://localhost:4173).

Any static file server works as an alternative, for example:

```powershell
py -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000).

## Supabase maintenance

Install the Supabase CLI, then from the repository root:

```powershell
supabase link --project-ref drajebrgyerzwyfiewpz
supabase migration list
supabase db push
supabase functions deploy submit-registration --project-ref drajebrgyerzwyfiewpz
```

Review `supabase migration list` before applying migrations. Keep the Edge Function's server-side key in Supabase project secrets; never put it in `application-config.js`, source control, or browser code.

Pushing commits to GitHub stores the linked frontend and backend source here; it does not by itself deploy changes to the live site or Supabase project.
