# Resend — waitlist email alerts

Get an email **every time someone joins the waitlist**, with their role, company, solutions needed, and Reddit UTM tracking.

---

## 1. Create a Resend account

1. Go to [resend.com](https://resend.com) → sign up.
2. **API Keys** → Create API key → copy `re_...` (shown once).

---

## 2. Sender address

**Quick test (no domain):**

```env
WAITLIST_FROM_EMAIL=onboarding@resend.dev
```

Resend only allows sending **to your own Resend account email** when using `onboarding@resend.dev`.

**Production (recommended):**

1. Resend → **Domains** → Add your domain (e.g. `outcomeledger.com`).
2. Add the DNS records Resend shows (SPF, DKIM).
3. After verified:

```env
WAITLIST_FROM_EMAIL=Outcome Ledger <waitlist@yourdomain.com>
```

---

## 3. API environment variables

Set on the **`outcome-ledger` API** service (Railway or `api/.env`):

| Variable | Example | Required |
|----------|---------|----------|
| `RESEND_API_KEY` | `re_xxxxxxxx` | Yes |
| `WAITLIST_NOTIFY_EMAILS` | `you@gmail.com` or `a@x.com,b@y.com` | Yes — **you** receive alerts |
| `WAITLIST_FROM_EMAIL` | `onboarding@resend.dev` or verified domain | Yes |
| `LANDING_URL` | `https://outcome-ledger-landing-production.up.railway.app` | Optional — welcome email link |
| `WAITLIST_WELCOME_EMAIL` | `true` | Optional — auto-reply to signups |

---

## 4. Railway (production)

```bash
cd outcome-ledger
railway link
railway service link outcome-ledger

railway variables set \
  RESEND_API_KEY=re_YOUR_KEY_HERE \
  WAITLIST_NOTIFY_EMAILS=your@email.com \
  WAITLIST_FROM_EMAIL="onboarding@resend.dev" \
  LANDING_URL=https://outcome-ledger-landing-production.up.railway.app \
  WAITLIST_WELCOME_EMAIL=false
```

Redeploy the API after changing variables (Railway usually restarts automatically).

---

## 5. Test it works

Replace `YOUR_API_KEY` with `OUTCOME_LEDGER_API_KEY` from Railway:

```bash
# Check config (no email sent)
curl -s -H "X-Api-Key: YOUR_API_KEY" \
  https://outcome-ledger-production.up.railway.app/v1/waitlist/email-status | jq .

# Send test email to WAITLIST_NOTIFY_EMAILS
curl -s -X POST -H "X-Api-Key: YOUR_API_KEY" \
  https://outcome-ledger-production.up.railway.app/v1/waitlist/test-email | jq .
```

Expected:

```json
{ "ok": true, "sentTo": ["your@email.com"], "from": "onboarding@resend.dev" }
```

Then submit the waitlist on your landing page — you should get `[Waitlist] email@company.com` within seconds.

---

## 6. What’s in the alert email

- Work email, name, role, company  
- Solutions they selected (CPST, finance proof, attribution, etc.)  
- `ref` / `utm_source` / `utm_campaign` (Reddit tracking)  
- Cohort fill: `12/50 (38 spots left)`

Export all signups:

```bash
curl -s -H "X-Api-Key: YOUR_API_KEY" \
  https://outcome-ledger-production.up.railway.app/v1/waitlist/signups | jq '.signups'
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| No email on signup | Check API logs; run `test-email` endpoint |
| `ready: false` in email-status | Set both `RESEND_API_KEY` and `WAITLIST_NOTIFY_EMAILS` |
| Resend 403 with test domain | Use `onboarding@resend.dev` and send only to your Resend login email |
| Welcome emails fail | Keep `WAITLIST_WELCOME_EMAIL=false` until domain is verified |
