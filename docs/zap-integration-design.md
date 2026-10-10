# Likes, dislikes and comments on Message Center posts via zap.ms

Status: design proposal, 10 October 2026. Nothing in this document is implemented.
Scope: mc.merill.net (this repo) and zap.ms (`~/github/zap`, remote `jozrahq/zap`).

## 1. Where things stand today

### mc.merill.net

- Next.js 15 static export (`output: 'export'`) deployed to GitHub Pages. The
  `merill.net` zone is on Cloudflare, so the site is served through Cloudflare's
  proxy (response headers show `server: cloudflare` in front of GitHub's Varnish).
  Hosting cost is zero. There is no analytics on the site, so traffic is unknown.
- Data pipeline: hourly GitHub Actions run of `@build/Update-Site.ps1` pulls Message
  Center posts from every configured tenant via Graph and the Roadmap RSS feed,
  writes `@data/`, commits, and dispatches a site build. The repo saw 19 data
  commits in the last 7 days, so the site rebuilds roughly three times a day.
- Content: 673 active Message Center posts, 1,889 Roadmap items, 3,826 archived
  posts. `public/messages-index.json` (5 MB) already carries, per post: `Id`,
  `Title`, `Source`, canonical `Url`, `Services`, `Tags`, `Category`, dates,
  `IsMajorChange` and a plain-text `Summary`. This is exactly the record zap
  needs; no new extraction work is required.
- The post page (`app/message/[id]/page.tsx`) is server-rendered at build time
  with no client-side JavaScript of its own. The only client component in the
  site is the home table, which already fetches `/messages-archive.json` in the
  browser, so a client-side fetch on the post page follows an existing pattern.
- Existing outbound hooks: RSS (latest 500), sitemap, `llms.txt`, and the
  Discord "Entra Scout" publisher (`scripts/publish-discord.mjs`) that runs at
  the end of the data refresh. A zap publisher slots in beside it.

### zap.ms

- Cloudflare Worker `zap-ms` (Hono + JSX server rendering), D1 database `zap_ms`
  (internal name `oof_news`, 250 KB, 18 tables), three KV namespaces, Analytics
  Engine, and a `send_email` binding. Better Auth email OTP. Double-submit CSRF.
  Hacker News style ranking with the score cached on `stories.score`.
- Deployed 11 May 2026, version `6c49b1f0`, which matches `main` HEAD per
  `docs/handoff.md`. D1 reports 138 reads and 0 writes in the last 24 hours:
  effectively no traffic. The front page shows two test stories.
- Email already goes through Cloudflare Email Service. `src/auth/better-auth.ts`
  calls `env.EMAIL.send(...)`; the deployed Worker has only `BETTER_AUTH_SECRET`
  and `SESSION_SECRET` as secrets, so there is no Resend or other provider wired
  in production. Resend existed only in the early history of the
  `lobsters-clone` branch and was removed in commit `5bb45e4`.
- Two divergent codebases exist:
  - `main` (3,361 lines): the deployed HN-style site with the documented
    "professional work community" design direction.
  - `origin/lobsters-clone` (5,073 lines): a Lobsters-style build on a different
    schema and D1 database with a markdown renderer and HTML allowlist, Cache API
    middleware, KV feed cache, rate limiting helpers, RSS/JSON feeds, moderation
    dashboard, invite tree, OAuth (Google, GitHub, Microsoft) and passkeys, and
    cron jobs. It was never merged. Several of its modules are worth porting.
- Gaps on `main` that matter for this project:
  - No edge caching. Every anonymous page view runs the Worker, constructs a
    Better Auth instance, and queries D1.
  - `/static/app.css` is served by the Worker, so each page view costs two
    invocations.
  - Hono `logger()` logs two lines per request to Workers Logs, on top of the
    invocation log. At scale this is the first thing that costs real money.
  - `/active` joins and groups over every comment on every request.
  - Story downvotes are rejected (`dir !== 1` is a 400). Only comments can be
    downvoted.
  - Comments render as escaped plain text. The HN-compatible formatter is still
    a to-do, so links and paragraphs do not work.
  - No rate limits, no Turnstile, no flag UI, no moderation pages, no edit or
    delete. Open sign-up today would be spam-prone.
  - Footer links to `/api/v1/openapi.json`, which returns 404. `/about` and
    `/guidelines` are plain text.

## 2. Target experience

```
 mc.merill.net/message/MC123456 (static, read-only)
 ┌──────────────────────────────────────────────────────────┐
 │ MC123456 - Title                                          │
 │ Summary card                                              │
 │ ┌ Discussion · 5 comments ────────────────────────────┐   │
 │ │ 👍 12   👎 3                    [ Write a comment → ] │   │
 │ │ jane (MVP) · 2h · ▲ 4                       reply →  │   │
 │ │   We hit this in our tenant, note that the policy…   │   │
 │ │   └ sam · 1h · ▲ 2                          reply →  │   │
 │ │       Same here. Act-by date moved twice already.    │   │
 │ │ priya (Microsoft) · 5h · ▲ 9                reply →  │   │
 │ │   Clarification from the product team: …             │   │
 │ │ … full thread, read-only …                           │   │
 │ └─────────────────────────────────────────────────────┘   │
 └──────────────────────────────────────────────────────────┘
          │ any click                       ▲ GET /api/v1/mc/MC123456 (JSON, edge cached)
          ▼                                 │
 zap.ms/mc/MC123456  → login (OTP / Microsoft) → react / reply → back link to mc
```

- On the mc post page, a "Discussion" section shows like and dislike counts and
  the full comment thread, read-only, in mc's own styling. Reading is free
  everywhere; every action (like, dislike, reply, write a comment) is a link
  into zap. mc never writes, never sets cookies, never needs auth.
- On the mc home page, an "Active discussions" box lists the Message Center
  posts people are talking about right now, with counts, linking to zap. This
  is the daily driver: the per-post thread hooks a reader, the aggregate view
  of what admins are discussing today exists only on zap.
- On zap, `/mc/MC123456` is the discussion page for that post: title, summary,
  services, a link back to the canonical mc page and to the admin center,
  a like/dislike bar, and threaded comments.
- A new section `/s/message-center` lists Message Center posts by activity.
  The front page shows a Message Center post only once people engage with it,
  so the human community is not buried under 20 to 40 bot posts a day.
- Later, the mc home table gains an engagement column, and the Discord Entra
  Scout embeds link to the zap discussion.

## 3. Architecture

Principles:

1. mc stays static and read-only. zap owns every piece of state and every write.
2. One small read-only JSON API, aggressively cached at the edge, feeds mc.
3. Ingest is a push from mc's existing hourly workflow. zap never polls or crons.
4. Anonymous traffic on zap never touches D1 or Better Auth when the cache is warm.
5. Everything fits inside the Workers Paid included quotas. Target spend: the
   $5 base plan.

### 3.1 Data model changes (zap D1)

- New table `mc_posts`, a metadata mirror of `messages-index.json`: `id`
  (`MC…` or `RM…`, primary key), `source`, `title`, `url`, `summary`, `services`
  (JSON), `tags` (JSON), `category`, `is_major_change`, `start_at`, `end_at`,
  `last_modified_at`, `synced_at`, `story_id` (nullable). About 6,400 rows,
  2 to 3 MB.
- `stories` gains `kind` (`user` | `mc`), `external_id` (unique index),
  `upvotes`, `downvotes` (so like and dislike display separately; `points`
  stays the ranking input), and `last_activity_at` (indexed, replaces the
  comment join in `/active`).
- A system account (for example `messagecenter`, flagged as a bot) authors the
  imported stories so existing joins keep working.
- `votes.dir` already allows -1. Allow -1 on stories where `kind = 'mc'`.
  Comments are unchanged.

### 3.2 Ingest (mc → zap)

- New `scripts/publish-zap.mjs` in this repo, called from the end of
  `@build/Update-Site.ps1` next to the Discord publisher. It posts changed index
  records to `POST https://zap.ms/api/v1/ingest/mc` with a bearer token held as
  a GitHub Actions secret and a Worker secret. Batches of 200. Idempotent upsert
  on zap.
- "Changed" = `LastModifiedDateTime` newer than the previous run, computed by
  diffing against `git show HEAD:@data/messages-index.json` before the commit.
  A `--all` flag does the one-off backfill (about 32 batches).
- On zap, the ingest upserts `mc_posts` and creates the story row for new
  Message Center posts with `created_at = StartDateTime`, `points = 0`, and
  a primary tag mapped from `Services` (Entra, Intune, Defender, Purview →
  `security`; Dynamics and Power Platform → `biz-apps`; Copilot → `ai`;
  everything else → `m365`). Backfilled posts carry their original dates, so
  they rank old and never appear as "new".
- Roadmap items: mirror the metadata, but create the story lazily on first
  reaction or comment. 1,889 bot stories add noise and no value until someone
  cares about one.
- Ordering guarantee: the push happens before the site rebuild is dispatched, so
  by the time a new mc post page is live, zap already knows the post.

### 3.3 Read API (zap → the visitor's browser on mc)

- `GET /api/v1/mc/:id` returns
  `{ id, storyId, url, up, down, commentCount, comments: [{ id, parentId, depth, author, badges, createdAt, score, html, url }], updatedAt }`
  with the full thread in display order (the same flattening `listComments`
  does today). `html` is the comment body already rendered and sanitized by
  zap's formatter, so there is exactly one formatter and one allowlist in the
  system and mc only places the markup. Capped at 100 comments, after which the
  response carries `truncated: true` and mc shows "View all on zap.ms". A
  50-comment thread is roughly 15 to 25 KB gzipped. 404 when the id is unknown.
- `GET /api/v1/mc/active` returns the ten Message Center posts with the most
  recent comment activity in the last seven days, with counts and the latest
  commenter, cached five minutes. This feeds the "Active discussions" box on
  the mc home page.
- Headers: `Cache-Control: public, s-maxage=60, stale-while-revalidate=600, max-age=30`
  and `Access-Control-Allow-Origin: https://mc.merill.net` (plus a dev origin
  from an env var). GET only, no credentials, so there is no CSRF surface.
- Served through the Cache API keyed by URL. The vote and comment handlers
  purge the key for the affected post and its item page, so counts update
  immediately after an interaction and D1 is hit at most once per post per
  minute regardless of mc traffic.
- `GET /api/v1/mc/counts` returns `{ "MC…": [up, down, comments], … }` for every
  post with any engagement (expected well under 1,000 entries), cached five
  minutes. This powers the home table column in a later phase.
- These routes are mounted before `csrf` and `attachUser`, so an anonymous API
  hit never constructs a Better Auth instance.

### 3.4 The mc embed

- New client component `app/message/[id]/components/discussion.tsx`
  (`"use client"`), rendered under the Summary card in `message-detail.tsx`.
  On mount it fetches the API and renders a skeleton, then the reaction counts
  and the whole thread: author with badge, age, score, body, and a "reply" link
  per comment, indented by depth. On 404 or error it renders "Be the first to
  react" with the zap link. No cookies, no storage, no third-party script. Dark
  mode via the existing Tailwind tokens.
- Comment bodies arrive as zap-sanitized HTML and are placed with
  `dangerouslySetInnerHTML`. zap is first-party, but add a small client-side
  allowlist pass as belt and braces, and never render markup from any other
  origin through this path.
- Links: `https://zap.ms/mc/{id}` for the post; `?react=up` or `?react=down`
  for reactions; `#comment-form` for a new comment; `?reply={commentId}` for
  a reply, which lands on zap with the inline reply box open; `#comment-{id}`
  as the permalink for sharing a single comment. zap URLs live in
  `config/site.ts`.
- New `components/active-discussions.tsx` on the home page, above or beside
  the table: fetches `/api/v1/mc/active` and lists the ten posts people are
  talking about, each linking to the zap discussion. Hidden entirely while the
  response is empty so a quiet day never advertises emptiness.
- Alternative considered: an iframe embed of `zap.ms/embed/mc/{id}`, Disqus
  style. It avoids duplicating any rendering and could later be offered to
  other sites (community blogs, CIPP, newsletters) as a distribution channel.
  It loses mc's native look and dark-mode integration, needs postMessage
  height syncing, and third-party cookie blocking means it still cannot know
  the visitor is logged in. Recommendation: JSON plus a native component for
  mc now; an embeddable widget for third-party sites as a Phase 3 or 4
  distribution play.
- SEO: comments are client-rendered, so they are not in mc's HTML. That is the
  intended split: mc is canonical for the post, zap is canonical for the
  discussion. An optional later step bakes `counts.json` into the static build
  so counts render server-side, with a graceful skip if zap is unreachable.
- Ship with a release-notes entry on the About page (per `AGENTS.md`).

### 3.5 zap pages and behaviour

- `GET /mc/:id` resolves the external id. For an mc story it renders the item
  page variant: "MC123456 - Title", source pill, summary, services, published
  and major-change flags, "Read on mc.merill.net" and "Open in Message Center"
  links, a like/dislike bar in place of the single upvote arrow, then comments.
  For a Roadmap id with no story yet, render read-only with a login call to
  action and create the story on the first write.
- `?react=up|down` after login renders a one-click confirm button ("Confirm 👍")
  rather than applying the vote on GET. No JavaScript needed, no GET side
  effects, CSRF token intact.
- Feeds: `/` and `/newest` filter to `kind = 'user' OR points > 0 OR comment_count > 0`
  so bot posts surface only once engaged. `/s/message-center` and `/mc` list
  all mc posts ordered by `last_activity_at`. `/active` switches to the new
  column.
- Ranking for mc posts: use `points = upvotes + downvotes` (engagement). The HN
  formula zeroes out anything with `points <= 1`, so `up - down` would make the
  most controversial Microsoft changes vanish, which is the opposite of what a
  discussion site wants. User stories keep `points = upvotes`.

### 3.6 Auth and email

- Email is already on Cloudflare Email Service in code and in production.
  Remaining checklist: confirm `zap.ms` is onboarded as a sending domain in the
  Email Service dashboard with DKIM, SPF and DMARC verified; send one live OTP
  to prove delivery; add inbound Email Routing for `hello@zap.ms` to a real
  inbox (free); confirm the bounce and suppression list is active.
- Protect `POST /auth/login` (the OTP send) with the Workers Rate Limiting
  binding (per IP and per email) and Turnstile. This is the one endpoint where
  an attacker turns requests into money ($0.35 per 1,000 emails past the
  included 3,000) and into sender-reputation damage. Better Auth's built-in
  limiter is in-memory per isolate and is not sufficient on Workers.
- Add "Sign in with Microsoft" (Better Auth `socialProviders.microsoft`,
  tenant `common`, multi-tenant app registration, redirect
  `https://zap.ms/api/auth/callback/microsoft`). The audience is M365 admins
  with work accounts; it removes an email per login, and it later verifies the
  `@microsoft.com` badge for free. Email OTP stays as the fallback.

### 3.7 Abuse and moderation minimum before sending traffic

- Rate limits on votes, comments, submits and OTP sends.
- Turnstile on login and on comments from accounts younger than a day.
- A comment formatter with an allowlist sanitizer (port `renderMarkdown` and
  the HTML helpers from `lobsters-clone`, or implement the planned HN-compatible
  formatter). Comments without links or paragraphs will not survive contact
  with real users.
- Flag link on comments writing to the existing `flags` table, plus a
  `/mod/flags` page and shadow-ban/delete actions (port from `lobsters-clone`).
- Revisit decision 10 ("no edit/delete window"): a ten-minute delete-your-own
  window is table stakes for a public community.

### 3.8 Reading on mc, participating on zap: what keeps the pull

Showing the whole thread on mc is deliberate. Reading one thread does not make
anyone a daily zap user; replying, being replied to, and having a feed of what
the community is discussing does. So the split is:

Free to read on mc:

- Like and dislike counts, the full comment thread, author names and badges,
  comment permalinks.
- The "Active discussions" box on the home page.

Only on zap:

- Reacting, commenting, replying, flagging, saving.
- The cross-post feeds: front page, `/active`, `/s/message-center`, sections,
  and later per-service feeds and search across discussions.
- Identity: profile, karma, badges, your threads and favourites.
- Return triggers: reply notifications by email, a weekly "most discussed
  changes" digest, and later followed services and people.
- The "new since your last visit" view, which needs a login.

Why this beats a teaser: a three-comment excerpt makes mc feel like a preview
of somewhere else and most readers never click through. A full thread with a
"reply" link under every comment turns readers into participants at the moment
they have something to say, which is the only conversion that matters. The
daily habit then forms around the aggregate view and the notifications, both
of which live on zap.

Both sites are yours, so pageviews moving between them is not a loss. The
metrics to watch are zap accounts created, comments per week, and the share of
visitors who return within seven days.

## 4. Cost model for zap.ms

Fixed: Workers Paid, $5/month. It is required for Email Service and includes
10 M requests, 30 M CPU-ms, KV 10 M reads and 1 M writes, D1 25 B rows read and
50 M rows written with 5 GB storage, 3,000 emails, and 20 M Workers Logs events
per month. Static asset requests are free and unlimited. Cache API has no
separate charge, but a cache hit still counts as one Worker request.

Traffic on mc is unknown, so the model uses three scenarios for mc post-page
views, which drive one embed API request each.

| Scenario | mc post views/day | Embed API req/month | CPU-ms/month (≈1 ms per cached hit) | Marginal cost |
| --- | --- | --- | --- | --- |
| Low | 20,000 | 0.6 M | 0.6 M | $0 |
| Medium | 100,000 | 3 M | 3 M | $0 |
| High | 300,000 | 9 M | 9 M | $0 (inside 10 M) |
| Very high | 1,000,000 | 30 M | 30 M | ≈ $6 requests, ≈ $0 CPU |

zap's own pages: anonymous HTML cached 60 s costs about 1 to 2 CPU-ms per hit.
Logged-in views bypass the cache and cost roughly 10 to 25 CPU-ms (Better Auth
session lookup plus three or four D1 queries). Even 50,000 logged-in views a
day lands near the 30 M CPU-ms line, for well under $1 of overage.

Full-thread payloads change bandwidth, not cost: Workers have no egress charge,
and a cached 20 KB response costs the same single request as a 1 KB one.

D1 reads with the 60 s cache are at most one miss per post per minute. Writes
are one row per vote or comment plus one score update. Both are rounding errors
against the included quotas. Storage: 10,000 comments is about 5 MB.

Email: one OTP per login with 30-day sessions. More than 3,000 logins a month
costs $0.35 per 1,000. Microsoft sign-in cuts this further.

Hidden costs to design out:

- Workers Logs. 10 M requests × (1 invocation log + 2 `logger()` lines) = 30 M
  events, 10 M over the included 20 M, about $6/month of pure waste. Remove
  `logger()` in production and set `observability.head_sampling_rate` to
  around 0.05.
- KV writes are $5 per million. Never write KV on a request path. The Cache API
  is free and sufficient for the front page; KV is for config only.
- D1 writes per page view. The `lastSeenAt` update is already throttled to ten
  minutes; keep it that way.
- Email abuse on the OTP endpoint (see 3.6).

Realistic steady state: $5/month. The $20 to $30 budget is only reachable with
tens of millions of monthly requests or a runaway email loop.

Measurement first: enable Cloudflare Web Analytics (free, one script tag) on
mc.merill.net and zap.ms now, so the embed is sized on real numbers before it
ships.

## 5. zap.ms home page optimisation

Ordered by payoff per line of code:

1. **Static assets binding.** Move `app.css` (and later any JS and the favicon)
   to Workers Static Assets. Removes one Worker invocation per page view at no
   cost.
2. **Anonymous edge cache.** Middleware on GET routes: if no Better Auth session
   cookie is present, serve from `caches.default` with
   `s-maxage=60, stale-while-revalidate=600`; on a miss, render and store.
   Logged-in users bypass it and keep their vote state. Write handlers purge
   the affected list and item keys. `lobsters-clone` has an `edgeCacheMiddleware`
   to port.
3. **Short-circuit `attachUser`.** Check for the session cookie before calling
   `createAuth(env)`. Anonymous requests then build no Better Auth instance and
   run no D1 query.
4. **Logs.** Drop `logger()` in production; sample observability.
5. **`last_activity_at` column** on stories so `/active` is an indexed sort
   instead of a join and group over all comments.
6. Later, if logged-in traffic grows: render pages without per-user state so
   everyone gets the cached HTML, and fetch vote state from a tiny
   `/api/me/state` endpoint (also exists on `lobsters-clone`). This needs a
   little JavaScript, so it is deliberately not phase one.
7. D1 lives in the OC region, so each query costs 150 to 250 ms for US and EU
   visitors. The edge cache hides this for anonymous traffic. D1 read
   replication is an option later for logged-in users.

## 6. Review of the social-platform direction

What is right already: server rendering with no client JavaScript, D1 as the
single source of truth, event-triggered ranking rather than cron recomputes,
Better Auth as a library rather than a SaaS, generated avatars with no uploads,
and a restrained design that reads as a work tool. The "OzBargain for Microsoft
technical knowledge" framing in `docs/design-strategy.md` is a good north star.

What needs attention before the site grows:

- **Two codebases.** Pick `main` (deployed, documented, designed) and port
  specific modules from `lobsters-clone`: markdown and sanitizer, rate limiting,
  cache middleware, RSS and JSON feeds, moderation routes. Then archive the
  branch. Maintaining both is the biggest hidden drag on the project.
- **The content loop needs seeds.** An empty community looks dead. Message
  Center posts solve this: they give every visitor something concrete to react
  to, and the mc site already has the search traffic. Show counts on mc only
  when they are above zero so empty strips never advertise emptiness.
- **Identity is the differentiator.** The planned badges (Microsoft employee,
  MVP) are exactly the trust cue an admin community wants. Microsoft sign-in
  brings the employee badge for free and matches how this audience already
  signs in to everything else.
- **Moderation before scale.** Flags, a mod queue, shadow-ban and delete are
  prerequisites for being linked from a site that ranks on Google.
- **Do not mirror Message Center bodies on zap.** Title, summary and link only.
  Duplicate content hurts both sites and the full post is one click away.
- **Public API as a product.** The embed API is the first real `/api/v1`
  surface. Document it with OpenAPI so the footer link stops being a 404 and
  so community tools (CIPP, Maester, newsletters) can pull discussion counts.
- **Distribution loops that already exist:** the Entra Scout Discord bot can
  link to the zap discussion; the mc RSS feed can carry comment counts;
  Entra.News can link to "most discussed changes this week". A weekly digest
  email costs about $0.35 per 1,000 recipients.
- **Housekeeping:** real `/about`, `/guidelines`, privacy and terms pages;
  D1 Time Travel covers 30 days, but a weekly export to R2 is cheap insurance.

## 7. Phased plan

**Phase 0, preparation (1 to 2 days).** Enable Cloudflare Web Analytics on both
sites. Verify the Email Service sending domain and send a live OTP. Decide the
branch strategy. Copy this document into `zap/docs`.

**Phase 1, zap cost hardening (small, independent PRs).** Static assets binding;
anonymous Cache API middleware; `attachUser` cookie short-circuit; log sampling
and remove `logger()`; `last_activity_at`; rate limiting binding plus Turnstile
on the OTP send; comment formatter and sanitizer.

**Phase 2, Message Center integration (the core deliverable).** Migration for
`mc_posts` and the `stories` columns; bot account; ingest endpoint; mc publish
script, workflow secret, and backfill; `/mc/:id` page with the reaction bar and
story downvotes for mc stories; feed filters and `/s/message-center`; read API
with CORS, cache and purge; the mc `discussion.tsx` full-thread component; the
`/api/v1/mc/active` endpoint and the "Active discussions" box on the mc home
page; About page release notes.

**Phase 3, growth loop.** Microsoft and GitHub sign-in; engagement column on
the mc home table; Entra Scout links to zap discussions; RSS for discussions;
flags and `/mod/flags`; ten-minute delete window; real about, guidelines,
privacy and terms pages; OpenAPI for `/api/v1`; weekly "most discussed" digest.

**Phase 4, social platform.** Follow sections and people; reply notifications
by email (batched); profiles with badges; a personalised front page alongside
the public one; personal API tokens; and, optionally, moving mc's own pages
onto Cloudflare so both sites share one edge and one analytics view.

## 8. Decisions needed

1. Like/dislike semantics and ranking for mc posts. Recommended: display both
   counts, rank by engagement (`up + down`).
2. Story creation: eager for Message Center, lazy for Roadmap. Recommended as
   stated.
3. Bot posts hidden from `/` and `/newest` until engaged, visible in their own
   section. Recommended yes.
4. Anonymous reactions. Recommended no: login is both the growth hook and the
   spam shield.
5. Delete or edit window for your own comments. Recommended: ten-minute delete.
6. Branch convergence: `main` plus ported modules. Recommended.
7. Microsoft sign-in in Phase 2 or Phase 3.
8. How much discussion to show on mc: the full thread, read-only, with reply
   links into zap (recommended), or a teaser of the top three comments.
9. Whether to also offer an embeddable widget for third-party sites later, as
   a distribution channel for zap.

## 9. Risks

- Traffic is unknown, so the embed cannot be sized precisely. Mitigated by the
  cache design and by turning on analytics first.
- Cold start: empty discussions everywhere. Mitigated by hiding zero counts,
  seeding through Entra Scout and Entra.News, and first comments from the
  owner on major changes.
- Email abuse on the OTP endpoint. Rate limits and Turnstile before any link
  from mc goes live.
- Single-region D1. Hidden behind the edge cache for anonymous traffic.
- Static-site latency on mc (up to an hour between data refresh and rebuild) is
  irrelevant to counts, which are live through the API.
- Cross-site concerns: mc sets no cookies and only issues GET requests, so
  there is no CSRF or third-party cookie exposure.

## Appendix: files that would change

This repo (mc):

- `scripts/publish-zap.mjs` (new), `@build/Update-Site.ps1` (call it),
  `.github/workflows/update-mc-data.yml` (pass the ingest token secret).
- `app/message/[id]/components/discussion.tsx` (new),
  `app/message/[id]/components/message-detail.tsx` (render it),
  `config/site.ts` (zap URLs), `app/about/page.tsx` (release notes).
- Later: `app/messages-table/columns.tsx` and `data-table.tsx` for the
  engagement column.

zap repo:

- `src/db/schema.ts` and a new migration; `src/routes/mc.tsx` (page, read API,
  ingest) and `src/views/mc.tsx` (new); `src/middleware/cache.ts` (new).
- `src/index.ts` (mount order, static assets, drop logger),
  `wrangler.jsonc` (assets, ratelimits, observability sampling, ingest token
  secret), `src/auth/middleware.ts` (cookie short-circuit),
  `src/auth/better-auth.ts` (Microsoft provider), `src/routes/stories.tsx`
  (story downvote for mc stories, feed filters, `/active`),
  `src/jobs/ranking.ts` (points semantics), `docs/` (architecture, roadmap).
