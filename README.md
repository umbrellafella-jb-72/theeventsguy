# The Events Guy — UK & European ecommerce events, month by month

A paid, month-by-month guide to ecommerce events and awards across the UK, Ireland and Europe, plus a directory of podcasts and webinars. Built with Next.js for Vercel and styled with The Events Guy design system.

## What's included

| Sheet tab | Where it appears | Notes |
|---|---|---|
| UK & Ireland | The guide, area "UK & Ireland" | |
| Rest of Europe | The guide, area "Europe" | Region is the country |
| Awards | The guide, format "Awards" | Adds categories and entry deadlines. Awards also listed on the UK tab are merged into one. US, APAC and MENA awards are skipped for now |
| Webinars & Podcasts | The Podcasts page (`/listen`) | A directory, not dated. Free visitors see 3 |
| Americas, Australia & RoW | Not yet | |

- **Free visitors** see the current month in full, event counts for every other month, and the first 3 podcasts.
- **Subscribers** (Stripe) see every month and the "dates TBC" list. They can filter by tag and add events to their calendar.
- **Listings refresh monthly** from the Google Sheet through a scheduled GitHub Action. Vercel redeploys on each refresh.

## Tagging

Every event gets six kinds of tag. They are worked out in `scripts/tagging.mjs` from the sheet's Type, Event, Organiser, City and Price columns.

| Tag | Values | Based on |
|---|---|---|
| Area (one) | UK & Ireland, Europe, Global & online | which tab; for awards, city and scope |
| Format (one) | Conference & summit, Trade show & expo, Meetup & networking, Dinner & social, Forum & roundtable, Workshop & training, Festival, Awards, Other | `Type` |
| Topic (any) | AI, Retail, DTC & brands, Marketing, Affiliate & partnerships, Search & SEO, Shopify, Marketplaces & Amazon, Payments & fintech, B2B commerce, Agencies, CX & retention, Fashion & beauty, Logistics & delivery, Data & analytics, Food drink & hospitality, Travel leisure & gaming, Tech & startups, Commerce tech, Ecommerce (general) | keywords in name, organiser, type and notes |
| Region or country (one) | UK regions (London, North West, Yorkshire…), Ireland, Online, plus the European country (Germany, Spain, Netherlands…) | `City` |
| Price (one) | Free, Paid, Invite only, Members only, Price not published | `Price Point` |
| Date status (one) | Confirmed, Tentative, TBC | `Date Status` |

To set topics by hand, add a **`Tags`** column to the sheet with comma-separated values. Your tags are added to the automatic ones. Each sync prints a report listing the events that still have no topic.

Events that list several dates, such as monthly series, appear in each of those months.

### Privacy: the Notes column is never published

The sheet's `Notes` column contains private material: contacts, partner terms, "you attended…" and Gmail references. The pipeline reads it only to infer topic tags and never writes it out. The same goes for the Awards tab's `Sponsors / partners` column (sponsorship contacts) and the Webinars tab's `Contact / socials`, `Why plug in`, `Priority` and `Last checked` columns. Bracketed text in `Organiser` and `2026 / 2025 Reference` is also stripped, because that's where contact details sit. If you want a public description per event, add a `Public summary` column and it can be wired in.

## Monthly refresh

```bash
npm run sync -- path/to/multi-tab-export     # a "## Sheet name:" export holding every tab
npm run sync                                  # straight from Google Sheets, one CSV link per tab (below)
```

This writes `data/events.json`. The file sits outside `public/`, so it's never served directly. Only the server renders it, and only to visitors who are allowed to see it.

**Automated:** `.github/workflows/monthly-refresh.yml` runs on the 1st of every month, and can also be run on demand from the Actions tab. Add one repository secret per tab. Each tab's `gid` is the number after `gid=` in the address bar when that tab is open:

| Secret | Tab |
|---|---|
| `SHEET_CSV_URL` | UK & Ireland (`gid=0`) |
| `SHEET_CSV_URL_EUROPE` | Rest of Europe |
| `SHEET_CSV_URL_AWARDS` | Awards |
| `SHEET_CSV_URL_MEDIA` | Webinars & Podcasts |

Each value has this form:

```
https://docs.google.com/spreadsheets/d/<SHEET_ID>/export?format=csv&gid=<TAB_GID>
```

A tab with no secret is skipped, and the sync says so.

The export URL only works if the sheet is shared as "Anyone with the link can view". That would expose the Notes column to anyone holding the link. The safer option is a separate sheet that pulls only the public columns with `=IMPORTRANGE(...)`; share that one and point `SHEET_CSV_URL` at it. Running `npm run sync` locally from a downloaded CSV and pushing the result also works.

## Payments and access

- Checkout: Stripe Checkout in subscription mode, using `STRIPE_PRICE_ID`.
- After payment, `/api/checkout/confirm` verifies the session with Stripe. It then sets an HMAC-signed, httpOnly cookie that lasts until the paid period ends, plus 3 days.
- **Sign in on another device:** `/restore` emails a 30-minute link to active subscribers through Resend. Without `RESEND_API_KEY`, the link is printed to the server log, which is handy for testing.
- **My subscription** opens the Stripe customer portal for cards, invoices and cancellation. Turn the portal on once in Stripe: Settings → Billing → Customer portal.
- `ACCESS_MODE=open` unlocks everything. Use it for preview deployments or demos.

## Deploy to Vercel

1. Push this folder to a private GitHub repo and import it in Vercel. The framework (Next.js) is detected automatically.
2. Add the environment variables from `.env.example`. At minimum set `ACCESS_SECRET` (`openssl rand -hex 32`), `NEXT_PUBLIC_SITE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID` and `NEXT_PUBLIC_PRICE_LABEL`.
3. In Stripe, create a Product with a recurring Price and copy its `price_…` ID.
4. Point theeventsguy.co.uk at the Vercel project.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in ACCESS_SECRET at least
npm run dev
```

## Next tabs

Adding *Americas, Australia & RoW* means one more entry in the `TABS` list in `scripts/sync.mjs`, a new area, and the country names in `regionOf()`. At that point, also drop the US/APAC/MENA filter on awards.
