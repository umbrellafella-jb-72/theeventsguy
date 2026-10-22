# EventGuy — UK ecommerce events, month by month

A paid, month-by-month guide to UK & Ireland ecommerce events, built with Next.js for Vercel and styled with the EventGuy design system.

- **Free visitors** see the current month in full, plus event counts for every other month.
- **Subscribers** (Stripe) see every month and the "dates TBC" list. They can filter by tag and add events to their calendar.
- **Listings refresh monthly** from the Google Sheet through a scheduled GitHub Action. Vercel redeploys on each refresh.

## Tagging

Every event gets five kinds of tag. They are worked out in `scripts/tagging.mjs` from the sheet's Type, Event, Organiser, City and Price columns.

| Tag | Values | Based on |
|---|---|---|
| Format (one) | Conference & summit, Trade show & expo, Meetup & networking, Dinner & social, Forum & roundtable, Workshop & training, Festival, Awards, Other | `Type` |
| Topic (any) | AI, Retail, DTC & brands, Marketing, Affiliate & partnerships, Search & SEO, Shopify, Marketplaces & Amazon, Payments & fintech, B2B commerce, Agencies, CX & retention, Fashion & beauty, Logistics & delivery, Data & analytics, Food drink & hospitality, Travel leisure & gaming, Tech & startups, Commerce tech, Ecommerce (general) | keywords in name, organiser, type and notes |
| Region (one) | London, North West, Yorkshire, Midlands, North East, South & South West, Scotland, Wales, Northern Ireland, Ireland, Online, Multiple cities, Location TBC | `City` |
| Price (one) | Free, Paid, Invite only, Members only, Price not published | `Price Point` |
| Date status (one) | Confirmed, Tentative, TBC | `Date Status` |

To set topics by hand, add a **`Tags`** column to the sheet with comma-separated values. Your tags are added to the automatic ones. Each sync prints a report listing the events that still have no topic.

Events that list several dates, such as monthly series, appear in each of those months.

### Privacy: the Notes column is never published

The sheet's `Notes` column contains private material: contacts, partner terms, "you attended…" and Gmail references. The pipeline reads it only to infer topic tags and never writes it out. Bracketed text in `Organiser` and `2026 / 2025 Reference` is also stripped, because that's where contact details sit. If you want a public description per event, add a `Public summary` column and it can be wired in.

## Monthly refresh

```bash
npm run sync -- path/to/export.csv          # one tab as CSV
npm run sync -- path/to/multi-tab-export     # a "## Sheet name:" export; picks SHEET_TAB
SHEET_CSV_URL=... npm run sync               # straight from Google Sheets
```

This writes `data/events.json`. The file sits outside `public/`, so it's never served directly. Only the server renders it, and only to visitors who are allowed to see it.

**Automated:** `.github/workflows/monthly-refresh.yml` runs on the 1st of every month, and can also be run on demand from the Actions tab. To set it up, add a repository secret `SHEET_CSV_URL` with this value:

```
https://docs.google.com/spreadsheets/d/<SHEET_ID>/export?format=csv&gid=0
```

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
4. Point eventguy.co.uk at the Vercel project.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in ACCESS_SECRET at least
npm run dev
```

## Next tabs

The sync is per tab (`SHEET_TAB`). Adding *Rest of Europe* or *Americas, Australia & RoW* is mostly a matter of extending `regionOf()` with those countries and syncing each tab into the same dataset.
