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
