# Reddit launch — waitlist landing

Use the **trackable waitlist** at `/join` when posting on Reddit. Every visit and signup stores UTM + `ref` so you can see which subreddit converts.

## Live URL

**Main landing** (AuthOn-style product page + waitlist at bottom):

```text
https://YOUR-DASHBOARD-DOMAIN/?utm_source=reddit&utm_medium=social&utm_campaign=r_SUBREDDIT&ref=r/SUBREDDIT
```

**Dedicated waitlist** (more news context):

```text
https://YOUR-DASHBOARD-DOMAIN/join?utm_source=reddit&utm_medium=social&utm_campaign=r_SUBREDDIT&ref=r/SUBREDDIT
```

**Dashboard** (design partners): `/overview`

**Local dev:** http://localhost:3001/ or http://localhost:3001/join?utm_source=reddit&...

## Example posts

### r/ExperiencedDevs or r/devops

**Title:** We built CPST tracking — AI spend ÷ merged PRs that didn’t revert (design partner waitlist)

**Body (short):**

> Leadership keeps asking for AI ROI; token dashboards don’t answer “what shipped for customers.”
>
> We’re opening **50 design partner slots** for Outcome Ledger — connects OpenAI/Anthropic/Cursor + GitHub and reports **cost per stable merged outcome (CPST)** with CFO-signable outcome contracts.
>
> Waitlist (tracks nothing creepy — just which subreddit you came from):  
> **YOUR_URL/join?utm_source=reddit&utm_campaign=r_experienceddevs&ref=r/experienceddevs**
>
> What would you need most? The form asks — we prioritize by pain (finance proof, attribution, board PDF, etc.).

### r/SaaS or r/startups

Focus on **budget burn** and **ROI theater** stats from the landing page news section.

## Tracking you get

| Event | Stored |
|-------|--------|
| Page view | `waitlist_page_views` — session, UTM, ref, path |
| Signup | `waitlist_signups` — email, role, company, **solutions[]**, UTM, ref |

**Export signups (API key required):**

```bash
curl -s -H "X-Api-Key: $OUTCOME_LEDGER_API_KEY" \
  "$OUTCOME_LEDGER_API_URL/v1/waitlist/signups" | jq .
```

Group by `utmCampaign` or `ref` to see which Reddit thread wins.

## Urgency knobs

| Env var | Default | Effect |
|---------|---------|--------|
| `WAITLIST_CAP` | `50` | “X spots left” + progress bar |

When full, signups return 409 but the form still encourages “next wave” messaging on the client.

## Subreddits that fit

- r/ExperiencedDevs, r/devops, r/platform_engineering  
- r/SaaS, r/startups (founder / CTO angle)  
- r/dataengineering (if you stress attribution graph later)  

**Avoid** pure promo subs; lead with the Uber/CPST problem, link once, reply to comments.

## Compliance

- Landing news items are **summarized industry narrative** — cite sources in UI footer.  
- Don’t claim Uber is a customer unless true.  
- Honeypot field `website` blocks naive bots.

## Email alerts (Resend)

On each **new** signup the API can email you (and optionally welcome the user).

| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY` | From [resend.com](https://resend.com) |
| `WAITLIST_NOTIFY_EMAILS` | Comma-separated — you get instant lead alerts |
| `WAITLIST_FROM_EMAIL` | Verified sender in Resend |
| `WAITLIST_WELCOME_EMAIL` | `true` — auto-reply to signup email |

Example alert subject: `[Waitlist] cto@acme.com · r/experienceddevs`

## Deploy checklist

1. Set `WAITLIST_CAP` on API (Railway).  
2. Add dashboard URL to `CORS_ORIGINS` / `DASHBOARD_URL`.  
3. Configure Resend + `WAITLIST_NOTIFY_EMAILS`.  
4. Share root URL with UTMs (product landing + `#get-started` waitlist).  
5. Pull `/v1/waitlist/signups`, sort by `solutions` + `ref`.
