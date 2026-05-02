---
name: microsoft-365-message-center-archive
description: Search and cite Microsoft 365 Message Center and Roadmap announcements from mc.merill.net. Use when answering questions about Message Center IDs, Roadmap items, Microsoft 365 change announcements, rollout dates, services, or archived posts.
license: MIT
metadata:
  author: Merill Fernando
  version: "1.0.0"
---

# Microsoft 365 Message Center Archive

Use this skill to search, summarize, and cite Microsoft 365 Message Center messages and Microsoft 365 Roadmap posts from `mc.merill.net`.

## Source Of Truth

This archive is for reference only. Microsoft 365 Message Center posts are tenant-specific. Always tell users to verify applicability, timing, and final details in their own tenant's Microsoft 365 Message Center.

## Primary URLs

- Agent guide: `https://mc.merill.net/llms.txt`
- Search index: `https://mc.merill.net/messages-index.json`
- RSS feed: `https://mc.merill.net/rss.xml`
- Sitemap: `https://mc.merill.net/sitemap.xml`
- Home: `https://mc.merill.net/`

## Workflow

1. Read `https://mc.merill.net/llms.txt` first for current guidance and URLs.
2. Use `https://mc.merill.net/messages-index.json` to search by Message Center ID, Roadmap ID, title, source, service, category, tag, date, or summary text.
3. Open the record's `Url` field for the canonical detail page before citing or summarizing.
4. Cite the canonical detail page URL, usually `https://mc.merill.net/message/{id}`.
5. Include the tenant-specific Message Center caveat when answering about Message Center posts.

## Search Guidance

Use the compact JSON index for broad discovery. It includes active Message Center messages, Microsoft 365 Roadmap posts, and archived Message Center messages. Prefer exact ID matches when the user provides an ID such as `MC123456` or a Roadmap item number.

For recent change feeds, use `https://mc.merill.net/rss.xml`. The RSS feed is limited to the latest active Message Center and Roadmap items, so do not use it as the only source for historical searches.

## Answer Guidance

- Distinguish between `Message Center` and `Roadmap` sources when relevant.
- Mention important dates such as published, last updated, rollout start, or rollout end when available.
- Mention affected services and categories when they help answer the question.
- Do not imply the archive contains every tenant-specific post.
- Do not treat archived or expired Message Center posts as currently applicable without checking the user's tenant.

## Citation Caveat

When citing Message Center posts, include wording like:

"Message Center posts are tenant-specific, so verify applicability in your own Microsoft 365 admin center."
