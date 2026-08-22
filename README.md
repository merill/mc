# Microsoft 365 Message Center Archive

This site is a simple archive of the Microsoft 365 Message Center and Microsoft 365 Roadmap. Message Center and Roadmap data is refreshed hourly and the site is rebuilt every four hours, providing a simple way to search and view posts.

I created this site so I can link to it from my weekly newsletter [Entra.News](https://entra.news) so folks could ready the message center post without having to log into the admin center.

> [!CAUTION]  
> This site is for reference only. Always refer to your tenant's Microsoft 365 message center post for the most accurate information that is relevant to your tenant.
> * Not all posts are visible to all tenants.
> * This archive is built from a small number of source tenants (for example a Microsoft 365 E5 tenant). Your tenant may have different features and updates. 

## Feedback

If you have any feedback or suggestions, please feel free to reach out to me on Twitter [@merill](https://twitter.com/merill) or [LinkedIn](https://linkedin.com/in/merill).

## Agent Skill

This repo includes a skills.sh-compatible agent skill for searching and citing the archive:

```bash
npx skills add merill/mc
```

The skill teaches agents to use `https://mc.merill.net/llms.txt`, search `https://mc.merill.net/messages-index.json`, cite canonical message pages, and remind users that Message Center posts are tenant-specific.

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

A tenant whose IDs or secret are missing is skipped with a warning rather than failing the run, so the refresh keeps working before a new tenant is fully wired up.

### Adding a federated identity tenant

The second tenant authenticates with workload identity federation, so there is no secret to store or rotate. In that tenant:

1. Create an app registration and grant it the `ServiceMessage.Read.All` application permission with admin consent.
2. Add a federated credential of type *GitHub Actions deploying Azure resources* with issuer `https://token.actions.githubusercontent.com`, organization `merill`, repository `mc`, entity *Branch*, branch `main`, and audience `api://AzureADTokenExchange`. Add a second credential for the *Pull request* entity if the workflow should also authenticate on pull request runs.

Then set the repository Actions **variables** (not secrets) `GRAPH_FEDERATED_TENANT_ID` and `GRAPH_FEDERATED_CLIENT_ID` to that tenant's directory and application IDs. The hourly workflow already requests an OIDC token through `permissions: id-token: write` and exchanges it for a Microsoft Graph token. Leaving the variables unset keeps the refresh on the primary tenant only.

Run `npm run test:tenants` to exercise the tenant configuration and merge logic locally; it needs no network access or credentials.
