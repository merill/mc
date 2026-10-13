# Microsoft 365 Message Center Archive

This site is a simple archive of the Microsoft 365 Message Center, the Microsoft 365 Roadmap and Azure Updates. The data is refreshed hourly, and each refresh that lands new data immediately kicks off a site rebuild (with an hourly staleness check and a four-hour scheduled rebuild as fallbacks), providing a simple way to search and view posts.

I created this site so I can link to it from my weekly newsletter [Entra.News](https://entra.news) so folks could ready the message center post without having to log into the admin center.

> [!CAUTION]  
> This site is for reference only. Always refer to your tenant's Microsoft 365 message center post for the most accurate information that is relevant to your tenant.
> * Not all posts are visible to all tenants.
> * This archive is built from a small number of source tenants (for example a Microsoft 365 E5 tenant). Your tenant may have different features and updates. 

## Bookmark filtered news

Choose services, a source, or a search term on the home page, then bookmark or
share the current URL. Opening it restores those filters. For example,
[Microsoft Purview news](https://mc.merill.net/?service=Microsoft+Purview).

URLs use one `service` parameter per selected service, `source=messageCenter`,
`source=roadmap` or `source=azure` for the source, and `q` for search text. Clearing a filter removes
its parameter without affecting the other filters.

Run `npm run test:filters` to check filter URL handling. The suite loads the
current service catalog, checks that selecting every service round-trips through
the URL, and reports the resulting URL length against a conservative
2,000-character compatibility budget. The budget is a warning, not a failure,
because the catalog grows with each data refresh.

## Feedback

If you have any feedback or suggestions, please feel free to reach out to me on Twitter [@merill](https://twitter.com/merill) or [LinkedIn](https://linkedin.com/in/merill).

## Agent Skill

This repo includes a skills.sh-compatible agent skill for searching and citing the archive:

```bash
npx skills add merill/mc
```

The skill teaches agents to use `https://mc.merill.net/llms.txt`, search `https://mc.merill.net/messages-index.json`, cite canonical message pages, and remind users that Message Center posts are tenant-specific.

## Azure updates

`scripts/update-azure.mjs` mirrors [Azure updates](https://azure.microsoft.com/updates) from Microsoft's public API (`https://www.microsoft.com/releasecommunications/api/v2/azure`), which needs no tenant or credentials. The hourly refresh runs it. The first run reads everything (about ten thousand updates back to 2013, under a minute); later runs ask only for what changed in the week before the newest update already stored. `node scripts/update-azure.mjs --full` reads everything again.

| File | Holds |
| --- | --- |
| `@data/azure/<Id>.json` | One file per update, in the shape used for every post. Rewritten only when the update changed. |
| `@data/azure.json` | The updates changed in the last year. The home page loads these up front, and they are the ones tracked for version history. |
| `@data/azure-index.json` | An index record per update, merged into `messages-index.json` and `messages-archive.json` by `Update-Site.ps1`. Not committed. |

An update Microsoft numbers gets the id `AZ` plus that number (`AZ574430`). Updates from before November 2024 only have a slug on Microsoft's side, so their id is `AZ-` plus the slug (`AZ-general-availability-traffic-manager`); pages and lists show the title instead of such an id. Azure products fill the `Services` field, so they appear in the Service filter. Updates older than a year are listed in `messages-archive.json` with `"Source": "azure"`; unlike the Message Center posts there, they are not expired.

Descriptions are cleaned before they are stored: only ordinary text markup, links and images are kept, without inline styling, scripts or event handlers. Run `npm run test:azure` to check the mapping and the cleaning.

## Version history

Every refresh compares each post with its last stored copy and appends a version to `@data/history/<Id>.json` when it changed (`scripts/update-history.mjs`). A post's page is built with the list of its versions: when each was captured and which fields changed. That list is open to everyone.

What each version said is not built into the site. Each version and each pair of versions used to be a page of its own, which came to about 44,000 pages and most of the site's size. Now:

* `scripts/publish-history.mjs` sends each changed history with two or more versions to zap.ms (`PUT <ZAP_INGEST_URL>/history/<Id>`, same token as the record ingest), which keeps one object per post in a private R2 bucket. Failures are remembered in `@data/history-pending.json` and retried on the next run.
* A signed-in visitor's browser reads the history from `/zap/api/v1/mc/<Id>/history` and draws the version or the comparison on the post's page. A signed-out visitor sees the list and a prompt to sign in.
* The address says what is open: `/message/MC123?v=3#version-history` for one version, `?from=2&to=5` for a comparison. The old `/message/<Id>/v/...` and `/message/<Id>/compare/...` addresses are redirected by the not-found page.

Signing in is a nudge towards a zap.ms account and keeps the cost bounded, since crawlers and signed-out visitors never reach the bucket. It is not secrecy: the histories are in this public repository.

To send everything again, for example after zap.ms is first deployed with the history routes, run the `update-m365-data` workflow by hand with **republish** ticked. It sends every post record and every history; both are safe to repeat. Locally, the same is `node scripts/publish-zap.mjs --all` and `node scripts/publish-history.mjs --all` with `ZAP_INGEST_URL` and `ZAP_INGEST_TOKEN` set.

Run `npm run test:history` to check the address handling, the comparison helpers and the publisher.

## Discord notifications

The hourly data workflow detects newly observed Message Center posts when either a service/product label or the title contains the standalone word `Entra`, case-insensitively. It publishes one rich Discord embed per new post and links to the canonical `mc.merill.net` archive page.

Create one incoming webhook named `Entra Scout` in the target Discord channel and configure its avatar in Discord. Save its URL as the repository Actions secret `DISCORD_ENTRA_SCOUT_WEBHOOK_URL`, using the same webhook URL and secret name in the EntraDiff repository. The two publishers share one Discord identity while retaining distinct message layouts and source labels. Both omit `avatar_url` by default so Discord uses the webhook's configured image; set `DISCORD_ENTRA_SCOUT_AVATAR_URL` only for an intentional override using a publicly accessible image URL.

Posts are only announced when Microsoft published them within the last 14 days (`-NewPostMaxAgeDays` on `Update-Site.ps1`), so adding a new source tenant does not announce the backlog of older posts it makes visible for the first time.

Delivery IDs and pending retries are persisted in `@data/discord-state.json`, so workflow reruns do not repost an existing Message Center ID. Set `DISCORD_ENABLED=false` to disable delivery or `DISCORD_DRY_RUN=true` to queue without sending. The legacy `DISCORD_ENTRA_MC_WEBHOOK_URL` variable remains a temporary compatibility fallback for local runs.

## Message Center tenants

Message Center posts are tenant specific, so the archive collects them from every tenant listed in `@build/config-m365.json` and merges the results. Each tenant contributes the posts the others cannot see; when the same message ID comes back from more than one tenant, the copy with the newest `LastModifiedDateTime` wins, and on a tie the copy with the most body content wins.

Each entry supports:

| Field | Purpose |
| --- | --- |
| `name` | Label used in the workflow log. |
| `tenantId`, `clientId` | Literal values, or a `${ENV_VAR}` placeholder resolved from the environment at run time. |
| `auth` | `clientSecret` (default) or `federatedIdentity`. |
| `secretEnv` | For `clientSecret` tenants, the environment variable holding the secret. Defaults to the `-GraphSecret` parameter. |
| `audience` | Federated credential audience. Defaults to `api://AzureADTokenExchange`. |
| `required` | `true` fails the run when the tenant cannot be refreshed; `false` logs a warning and continues. The first tenant defaults to required. |
| `tenantListEnv` | Expands the entry into one tenant per item of a JSON list held in this environment variable (see contributor tenants below). |
| `type` | Optional kind of tenant. Only `edu` is recognized; anything else is ignored. Posts that only tenants of one type return are saved with `SeenOnlyIn` (for example `"edu"`) and shown with a "Seen in EDU tenants" label. |
| `private` | `true` masks the tenant and client IDs in workflow logs and reduces sign-in errors to AADSTS codes, so logs never identify the organization. Always on for `tenantListEnv` tenants. |

A tenant whose IDs or secret are missing is skipped with a warning rather than failing the run, so the refresh keeps working before a new tenant is fully wired up.

### Adding a federated identity tenant

The second tenant authenticates with workload identity federation, so there is no secret to store or rotate. In that tenant:

1. Create an app registration and grant it the `ServiceMessage.Read.All` application permission with admin consent.
2. Add a federated credential of type *GitHub Actions deploying Azure resources* with issuer `https://token.actions.githubusercontent.com`, organization `merill`, repository `mc`, entity *Branch*, branch `main`, and audience `api://AzureADTokenExchange`. Add a second credential for the *Pull request* entity if the workflow should also authenticate on pull request runs.

Then set the repository Actions **variables** (not secrets) `GRAPH_FEDERATED_TENANT_ID` and `GRAPH_FEDERATED_CLIENT_ID` to that tenant's directory and application IDs. The hourly workflow already requests an OIDC token through `permissions: id-token: write` and exchanges it for a Microsoft Graph token. Leaving the variables unset keeps the refresh on the primary tenant only.

### Contributor tenants

Community members can contribute their tenant from the [About page](https://mc.merill.net/about#contribute) without sharing a secret:

* **One-click consent (recommended).** A multi-tenant `Message Center Archive - Reader` app registered in the home tenant holds the only permission, `ServiceMessage.Read.All`, and a federated credential for `repo:merill@1288081/mc@761074595:ref:refs/heads/main` (the repository uses GitHub's immutable OIDC subject format, so the name-only `repo:merill/mc:...` subject does not match). A contributor's admin consents through the About page button, lands on `/connect`, and emails the tenant ID shown there. The refresh then requests a token for that tenant with the same GitHub OIDC assertion.
* **Own app registration.** A contributor registers a single-tenant app with the same permission and a federated credential with the same immutable subject, and emails its tenant and client IDs.

Contributor tenants are tracked in the private `merill/mc-tenants` repository, which verifies each tenant and writes the anonymous list to the `GRAPH_CONTRIBUTOR_TENANTS` Actions **secret**: a JSON array such as `[{"label":"c01","tenantId":"...","type":"edu"},{"label":"c02","tenantId":"...","clientId":"..."}]` (plain tenant ID strings also work). The optional `type` marks an education tenant. Labels appear in public logs, so they must be short anonymous tokens; anything else is replaced with a number. The secret is only passed on non pull request runs, which are the runs the federated credential trusts.

The same sync writes the repository **variable** `CONTRIBUTOR_CREDITS`, for example `{"tenants":3,"credits":[{"name":"Jane Doe","url":"https://..."}]}`. It holds only the names (and optional https links) of contributors who asked to be credited, plus a count of all verified tenants. The site build reads it to show the thank-you list on the About page; the list is hidden while the variable is unset.

The multi-tenant app's client ID (`158ad002-7467-454f-ba15-229a0b719811`) is not a secret, so it is set directly in `@build/config-m365.json` (used for every contributor without their own `clientId`) and in `config/site.ts` (the consent button). The app needs the Web redirect URI `https://mc.merill.net/connect`.

Run `npm run test:tenants` to exercise the tenant configuration and merge logic locally; it needs no network access or credentials.
