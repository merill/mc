# Microsoft 365 Message Center Archive

This site is a simple archive of the Microsoft 365 Message Center and Microsoft 365 Roadmap. It is updated daily and provides a simple way to search and view posts.

I created this site so I can link to it from my weekly newsletter [Entra.News](https://entra.news) so folks could ready the message center post without having to log into the admin center.

> [!CAUTION]  
> This site is for reference only. Always refer to your tenant's Microsoft 365 message center post for the most accurate information that is relevant to your tenant.
> * Not all posts are visible to all tenants.
> * This archive uses a tenant that has a Microsoft 365 E5 subscription. Your tenant may have different features and updates. 

## Feedback

If you have any feedback or suggestions, please feel free to reach out to me on Twitter [@merill](https://twitter.com/merill) or [LinkedIn](https://linkedin.com/in/merill).

## Agent Skill

This repo includes a skills.sh-compatible agent skill for searching and citing the archive:

```bash
npx skills add merill/mc
```

The skill teaches agents to use `https://mc.merill.net/llms.txt`, search `https://mc.merill.net/messages-index.json`, cite canonical message pages, and remind users that Message Center posts are tenant-specific.

## Discord notifications

The hourly data workflow detects newly observed Message Center posts whose `Services` collection contains `Microsoft Entra`. It publishes one rich Discord embed per new post and links to the canonical `mc.merill.net` archive page.

Create one incoming webhook named `Entra Scout` in the target Discord channel and configure its avatar in Discord. Save its URL as the repository Actions secret `DISCORD_ENTRA_SCOUT_WEBHOOK_URL`, using the same webhook URL and secret name in the EntraDiff repository. The two publishers share one Discord identity while retaining distinct message layouts and source labels. Both omit `avatar_url` by default so Discord uses the webhook's configured image; set `DISCORD_ENTRA_SCOUT_AVATAR_URL` only for an intentional override using a publicly accessible image URL.

Delivery IDs and pending retries are persisted in `@data/discord-state.json`, so workflow reruns do not repost an existing Message Center ID. Set `DISCORD_ENABLED=false` to disable delivery or `DISCORD_DRY_RUN=true` to queue without sending. The legacy `DISCORD_ENTRA_MC_WEBHOOK_URL` variable remains a temporary compatibility fallback for local runs.
