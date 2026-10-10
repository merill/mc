# Implementation handoff: zap.ms discussions on mc.merill.net

For the implementing agent. Read `docs/zap-integration-design.md` first; it is
the "what and why". This file is the "how": ground rules, task order,
acceptance criteria, and what only the owner (Merill) can do. Work through the
tasks in order and stop for review where the task says so.

## Repositories and environment

| Repo | Path | Stack | Deploy |
| --- | --- | --- | --- |
| mc | `/Users/merill/github/mc` | Next.js 15 static export, Tailwind, TypeScript 4.9, npm | GitHub Pages via `.github/workflows/update-mc-site.yml` on push to `main` |
| zap | `/Users/merill/github/zap` | Cloudflare Worker, Hono + JSX, Drizzle + D1, Better Auth, Biome, Vitest, npm | `npm run deploy` (wrangler). Production is live at https://zap.ms |

- wrangler is logged in as merill@merill.net. Production Worker `zap-ms`, D1 `zap_ms`.
- zap's `main` is the deployed branch. Ignore `origin/lobsters-clone` except to
  port individual modules named below.
- Both repos have other work landing on `main` (mc gets an hourly data commit).
  Branch from a fresh `main` and rebase before opening a PR.

## Ground rules

1. One pull request per task below, against `main`, on a branch named
   `zap/<task-slug>`. Keep PRs reviewable: under ~500 changed lines of source.
2. Never deploy zap to production or run `db:migrate:remote` without an explicit
   go-ahead in chat. Local (`wrangler dev`, `db:migrate:local`) is fine.
3. Never commit secrets. Ingest tokens go in GitHub Actions secrets and
   `wrangler secret put`; local values in `.dev.vars` (gitignored).
4. mc stays a static site. No server runtime, no cookies, no storage, no
   third-party scripts. Only `GET` requests to zap, no credentials.
5. zap owns every write. No KV writes on request paths. No cron polling. No
   full-table recomputes in handlers (see zap `docs/architecture.md`).
6. Checks must pass before a PR is opened:
   - mc: `npm run typecheck && npm run lint && npm run test:filters && npm run build`
   - zap: `npm run typecheck && npm run lint && npm run test && npm run build`
7. Any user-visible change on mc gets a dated entry in the Release notes card
   in `app/about/page.tsx` (see `AGENTS.md`). Any architecture change on zap
   updates `docs/architecture.md` and `docs/roadmap.md`.
8. Match existing code style: mc uses Prettier (`npm run format:write`), zap uses
   Biome (`npm run lint:fix`). Follow the patterns already in the file you are
   editing rather than introducing new ones.
9. Do not add dependencies without saying why in the PR description.
10. When something needs the owner (dashboard settings, DNS, secrets, app
    registrations, deploy approval), finish everything else in the task, list
    the blocked item in the PR description, and move on.

## Decisions already taken

These are the design document's recommendations, adopted as defaults:

- Message Center posts get a story on zap eagerly at ingest; Roadmap items are
  mirrored but become stories only on first reaction or comment.
- Like and dislike both display; mc-kind stories rank by `upvotes + downvotes`.
  User-submitted stories keep `points = upvotes`.
- Bot stories are hidden from `/` and `/newest` until they have a vote or a
  comment; they are always listed in `/s/message-center` and `/mc`.
- No anonymous reactions. All writes require a zap login.
- The whole thread is shown on mc, read-only, capped at 100 comments.
- Converge on zap `main`; port modules from `lobsters-clone` as needed.
- Microsoft sign-in ships in Phase 2 (Task 8 below).
- Ten-minute delete window for your own comments (Task 9, can slip).

## Tasks

### Task 0: HTML mockups (stop for review)

Static, self-contained HTML in `mc/docs/mockups/` showing the mc post page with
the Discussion section, the mc home page with the Active discussions box, and
the zap `/mc/:id` page. Light and dark, 375 px and 1280 px. No code changes
elsewhere. **Stop after this task and wait for the owner's review.** Carry any
feedback into Tasks 5 and 7.

(This task may already be done when you start; check the folder.)

### Task 1: zap cost hardening

Repo: zap. Independent of the integration; small PRs, can be split.

- Serve CSS, favicon and future JS from Workers Static Assets (`assets` block in
  `wrangler.jsonc`, files under `public/`). Remove the `/static/app.css` route.
- Add an anonymous edge-cache middleware for `GET` HTML: if no Better Auth
  session cookie is present, try `caches.default`; on miss render and store
  with `Cache-Control: public, s-maxage=60, stale-while-revalidate=600`.
  Logged-in requests bypass it. Write handlers (`/submit`, `/item` comment,
  `/vote`, `/favorite`) purge the affected list pages and item page. Port the
  shape of `edgeCacheMiddleware` from `origin/lobsters-clone:src/auth/cache.ts`.
- In `src/auth/middleware.ts`, return early when the request has no Better Auth
  session cookie, before `createAuth(env)` runs.
- Remove hono `logger()` outside `ENVIRONMENT=development`; set
  `observability.head_sampling_rate` to `0.05` in `wrangler.jsonc`.
- Add `last_activity_at` to `stories` (migration), set on comment insert, and
  rewrite `/active` to order by it instead of joining comments.
- Fix a live layout bug found while mocking up: at 640 px and below `.topnav`
  has `flex: 1`, which stops it wrapping onto its own line. `flex-basis: 100%`
  in that media query fixes it (see `docs/mockups/zap-mc-post.html`).

Acceptance: anonymous `curl -I https://localhost:8787/` shows the cache header;
a second request within 60 s is served without a D1 query (check with
`wrangler dev` logs); `/active` runs a single indexed query; tests pass.

### Task 2: zap schema and ingest endpoint

Repo: zap. Migration plus routes.

- New table `mc_posts` and new `stories` columns `kind`, `external_id` (unique),
  `upvotes`, `downvotes`, exactly as design §3.1. Seed a system user
  `messagecenter` (flag it; add an `is_bot` boolean to `app_users`).
- `POST /api/v1/ingest/mc`: bearer token from secret `ZAP_INGEST_TOKEN`
  (constant-time compare), JSON body `{ records: IndexRecord[] }` where
  `IndexRecord` is one entry of mc's `public/messages-index.json`. Upsert
  `mc_posts`; for `Source = messageCenter` create the story if missing with
  `kind='mc'`, `external_id=Id`, `author=messagecenter`, `created_at` from
  `StartDateTime`, `points=0`, `primary_tag` from the Services mapping in
  design §3.2. Idempotent: re-sending the same batch changes nothing. Max 200
  records per call; respond `{ upserted, storiesCreated }`.
- This route is mounted before `csrf` and `attachUser`.

Acceptance: unit tests for the upsert (new, changed, unchanged, bad token,
oversize batch); `npm run db:migrate:local` applies cleanly.

### Task 3: mc publisher and backfill

Repo: mc.

- `scripts/publish-zap.mjs`, modelled on `scripts/publish-discord.mjs`: reads
  `@data/messages-index.json`, selects records whose `LastModifiedDateTime` is
  newer than in `git show HEAD:@data/messages-index.json` (or all records with
  `--all`), posts them in batches of 200 to `ZAP_INGEST_URL` with
  `ZAP_INGEST_TOKEN`. `--dry-run` prints counts and sends nothing. Exit 0 on
  partial failure after logging, so the data workflow never fails because zap
  is down.
- Call it from the end of `@build/Update-Site.ps1` after the Discord publisher.
  Pass `ZAP_INGEST_URL` and `ZAP_INGEST_TOKEN` in
  `.github/workflows/update-mc-data.yml` (token as a secret; skip on pull
  request runs like the Discord step does).
- Add `npm run test:zap` with `node --test scripts/test-publish-zap.mjs`
  covering the diff selection and batching.

Owner-only: create the GitHub secret, run `wrangler secret put ZAP_INGEST_TOKEN`,
and approve the one-off `--all` backfill against production.

### Task 4: zap discussion page and voting

Repo: zap.

- `GET /mc/:id`: resolve `external_id`; render the item page variant from
  design §3.5 (title, source pill, summary, services, dates, links to
  `https://mc.merill.net/message/{id}` and the admin center, reaction bar,
  comment form, threaded comments). Unknown id: 404 with a link to mc. Roadmap
  id with metadata but no story: render read-only with a login call to action;
  create the story on first write.
- `?react=up|down`: when logged in, show a one-click "Confirm" form that posts
  to `/vote`; when logged out, the login link carries `returnTo` including the
  `react` parameter.
- `/vote`: accept `dir=-1` on stories with `kind='mc'`; maintain `upvotes` and
  `downvotes`; for mc-kind stories set `points = upvotes + downvotes` before
  `recomputeStoryScore`.
- Feeds: `/` and `/newest` filter `kind='user' OR points>0 OR comment_count>0`.
  Add `/s/message-center` (ordered by `last_activity_at`) and alias `/mc`.
  Add it to the top nav.
- Comment insert updates `last_activity_at` on the story.

Acceptance: tests for vote direction rules per kind and for the feed filter;
manual check in `wrangler dev` with a locally ingested sample.

### Task 5: zap read API

Repo: zap.

- `GET /api/v1/mc/:id` and `GET /api/v1/mc/active` exactly as design §3.3,
  including `html` rendered by the comment formatter (Task 7; until then
  escaped text wrapped in `<p>`), `truncated`, and the 100-comment cap.
- Headers: `Cache-Control: public, s-maxage=60, stale-while-revalidate=600,
  max-age=30`; `Access-Control-Allow-Origin` from env var `EMBED_ORIGINS`
  (comma separated; production `https://mc.merill.net`, dev adds
  `http://localhost:3000`); `Vary: Origin`.
- Served through `caches.default`; `/vote` and comment handlers on mc-kind
  stories purge `/api/v1/mc/:id` and `/api/v1/mc/active`.
- Mounted before `csrf` and `attachUser`. Document both endpoints in a first
  `public/api/v1/openapi.json` so the footer link stops returning 404.

Acceptance: tests for shape, cap, CORS header, 404; a `curl` from another
origin shows the CORS header; repeated requests within 60 s do not hit D1.

### Task 6: mc discussion component and home box (stop for review)

Repo: mc. Implements the approved mockups.

- `app/message/[id]/components/discussion.tsx` (`"use client"`), rendered in
  `message-detail.tsx` under the Summary card. Skeleton, then counts and the
  full thread; empty and truncated states; all controls are links per design
  §3.4. Comment `html` is placed with `dangerouslySetInnerHTML` after a
  client-side allowlist pass (tags: p, a, em, strong, code, pre, blockquote,
  ul, ol, li, br; attributes: href on a only, http(s) schemes only).
- `components/active-discussions.tsx` on `app/page.tsx` per the approved
  mockup; hidden while the API returns no items or fails.
- zap base URL and API origin in `config/site.ts`.
- Release notes entry in `app/about/page.tsx`.
- **Stop for review** with screenshots (light, dark, mobile, desktop) before
  the PR is merged.

Acceptance: `npm run build` succeeds; the component renders against the local
zap dev server with `EMBED_ORIGINS` including `http://localhost:3000`; no
console errors; no cookies set by mc.

### Task 7: abuse protection and comment formatter

Repo: zap.

- Rate Limiting binding (`ratelimits` in `wrangler.jsonc`): OTP send per IP
  (5 per 10 min) and per email (3 per 10 min); votes 60 per min per user;
  comments 5 per 10 min for accounts younger than one day; submits 3 per hour.
  Return a friendly page, not a bare 429, on the login form.
- Turnstile on `/auth/login` (site and secret keys from the owner).
- Comment formatter and allowlist sanitizer, applied on render for comments
  and text posts. Port `renderMarkdown` and the HTML helpers from
  `origin/lobsters-clone:src/lib/markdown.ts` and `src/lib/html.ts`, or
  implement the HN-compatible formatter from zap `docs/roadmap.md`. Outbound
  links get `rel="ugc nofollow noopener"`.

Owner-only: create the Turnstile widget and set the secret.

### Task 8: Microsoft and GitHub sign-in

Repo: zap. Add `socialProviders.microsoft` (tenant `common`) and `github` to
`src/auth/better-auth.ts`; buttons on the login page; keep email OTP. Update
`docs/auth-setup.md`.

Owner-only: multi-tenant app registration with redirect
`https://zap.ms/api/auth/callback/microsoft`, GitHub OAuth app, secrets.

### Task 9: flags, moderation minimum, delete window

Repo: zap. Flag link on comments writing to `flags`; `/mod/flags` for
moderators (port from `origin/lobsters-clone:src/routes/mod.ts`); shadow-ban
and delete actions logged to `mod_log`; delete-your-own-comment within ten
minutes. Update `docs/decisions.md` (decision 10).

## Verification before any production deploy

```bash
cd /Users/merill/github/zap && npm run typecheck && npm run lint && npm run test && npm run build
cd /Users/merill/github/mc && npm run typecheck && npm run lint && npm run test:filters && npm run build
```

After the owner deploys zap:

```bash
curl -sI https://zap.ms/ | grep -i cache-control
curl -s -H 'Origin: https://mc.merill.net' -D - -o /dev/null https://zap.ms/api/v1/mc/active | grep -i access-control
```

## Things only the owner can do

- Cloudflare dashboard: confirm the `zap.ms` Email Service sending domain is
  verified (DKIM, SPF, DMARC); enable Cloudflare Web Analytics on both sites;
  create the Turnstile widget.
- Secrets: `ZAP_INGEST_TOKEN` (GitHub and wrangler), Turnstile secret, OAuth
  client secrets.
- Entra: multi-tenant app registration for Microsoft sign-in.
- Approvals: every production deploy, every remote migration, the one-off
  backfill.

## Kickoff prompt

Paste this as the first message of the implementing session:

```text
Read /Users/merill/github/mc/docs/zap-integration-design.md and then
/Users/merill/github/mc/docs/zap-integration-handoff.md in full. Follow the
handoff's ground rules exactly. Work through the tasks in order, one PR per
task, branch from a fresh main, and stop for my review where a task says so.
Both /Users/merill/github/mc and /Users/merill/github/zap are in scope; ask to
add the zap folder to the session if you cannot read it. Do not deploy, run
remote migrations, or touch secrets without my go-ahead. Start by telling me
which task you are on and what you will change.
```
