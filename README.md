# The Events Guy — UK & European ecommerce events, month by month

A paid, month-by-month guide to ecommerce events and awards across the UK, Ireland and Europe, plus a directory of podcasts and webinars. Built with Next.js for Vercel and styled with The Events Guy design system.

## What's included

| Sheet tab | Where it appears | Notes |
|---|---|---|
| UK & Ireland | The guide, area "UK & Ireland" | |
| Rest of Europe | The guide, area "Europe" | Region is the country |
| Awards | The Awards page (`/awards`) and the guide, format "Awards" | Adds categories and entry deadlines. Awards also listed on the UK tab are merged into one. US, APAC and MENA awards are skipped for now. Optional columns: `Judges` (names separated by `;`), `Entry link`, `Eligibility`, `How to enter` |
| Webinars & Podcasts | The Podcasts page (`/listen`) | A directory, not dated. Free visitors see 3 |
| Speakers (optional) | The Speakers page (`/speakers`), plus a "Speakers:" line on each event card | Columns: Name, Role, Company, Bio, LinkedIn, Event(s). See `data/speakers-template.csv` |
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
| `SHEET_CSV_URL_SPEAKERS` | Speakers (optional) |

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
- **Renewals:** `middleware.ts` keeps subscribers signed in when their subscription renews. From a day before the period ends, it checks Stripe at most once an hour and extends the cookie. No webhook or database is needed.
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

## Speaker profiles

Add a **Speakers** tab to the sheet with the columns in `data/speakers-template.csv`, and a `SHEET_CSV_URL_SPEAKERS` secret for its CSV link.

- **Event(s)**: the event name exactly as it appears on the events tabs. Separate several names with `;`. Each speaker is linked to the next edition of each event, so a profile's "Speaking at" link opens that event in the guide, and the event card lists its speakers with links back to their profiles.
- **LinkedIn**: must be a profile address (`https://www.linkedin.com/in/…`). Any other link is dropped, and the sync names the speakers affected.
- **Bio**: about 300 characters. Longer bios are trimmed. Only publish bios the speaker has written or approved.

Each sync reports any event names it couldn't match. Until the tab exists, the page shows a "profiles are on their way" message.

## Charity partner

Half of every subscription goes to Forget Me Not Children's Hospice (registered charity no. 1110457). The wording lives in `lib/charity.ts`. Put the logo the charity supplies at `public/partners/forget-me-not-logo.png` (or `.svg`); it then replaces the plain-text name on the homepage automatically.

## Awards page

`/awards` lists every upcoming award with its entry status, judges, fee and a how-to-enter panel, followed by a general guide to entering (`ENTRY_STEPS` and `JUDGE_TIPS` in `lib/awards.js`).

- **Entry status** is read from the free-text `Entry deadline(s)` column (`entryInfo()` in `lib/awards.js`): a future date is a deadline ahead; "Closed…" is closed; "about", "usually", "TBC" or last year's dates mean dates to come; blank or "Check site" sends people to the organiser. The card always shows the original wording too. Writing full dates ("30 Oct 2026") gives the best results.
- **Judges** come from the optional `Judges` column on the Awards tab, plus anyone on the Speakers tab whose `Event(s)` lists the award. A judge whose name matches a speaker profile links to it, and their profile shows the award under "Judging".
- **Free visitors** see the next month that has award ceremonies; subscribers see all of them.

## Event details, public pages and member features

### Optional columns (UK & Ireland, Rest of Europe and Awards tabs)

| Column | Shows as |
|---|---|
| `Description` | A short paragraph on the card and event page |
| `Start time`, `End time` | 24-hour, e.g. `09:30`. Used in calendar entries (local time); all-day if blank |
| `Booking link` | The "Book tickets" button (falls back to the website) |
| `Sponsors` | Names separated by `;` |
| `Social links` | URLs separated by spaces or `;` — labelled LinkedIn, X, Instagram… automatically |
| `Organiser website` | Links the organiser's name |
| `Sector` | Industry, separated by `;` (otherwise worked out from the name and notes) |
| `Featured` | `Yes` for Partner events: shown in full to everyone, top of their month, on the homepage. The soonest one fills the full-width homepage hero |
| `Hero image`, `Hero video` | URLs for that hero: a wide photo (at least 1920px) and/or a short muted .mp4/.webm loop. Without them the hero shows a slowly panning port scene |

### What's public

Every event has a page at `/events/<id>` with its name, dates, city, category, industry and organiser, plus schema.org Event data, a sitemap (`/sitemap.xml`) and `robots.txt`, so search engines can index the whole calendar. Visitors browse every month as teaser cards. The free month (the current one) and featured events are shown in full. Members see everything. Locked details are never sent to a visitor's browser.

### Member features

- **Search:** text, dates (from/to and month), area/country, category, industry, plus topic and price for members.
- **Shortlist:** "Save" on any event; `/shortlist` lists them, with "Download all (.ics)".
- **Add to calendar:** Google Calendar, Outlook.com, Outlook (Microsoft 365) and an `.ics` file for Apple Calendar and everything else (`/api/ics/<id>`), plus a private **calendar feed** of the shortlist (`/api/calendar/<token>`) that calendars keep in sync.
- **Share:** native share sheet, copy link, copy details, email, LinkedIn, WhatsApp; "Print or save as PDF" on the event page.
- **Emails:** "new events" after each monthly refresh (`/api/cron/digest`, using `data/changes.json` written by the sync) and reminders a week and a day before saved events (`/api/cron/reminders`). Both run daily from `vercel.json`, are opt-out from `/account`, and every email carries a one-click unsubscribe.
- **Account:** `/account` — billing (Stripe portal), the calendar feed and email settings.

### Switching on the member database

Saved events, the calendar feed and member emails need somewhere to store each member's shortlist and settings. In Vercel: **Storage → Marketplace → Upstash (Redis)** → connect it to the project; it adds `KV_REST_API_URL` and `KV_REST_API_TOKEN`. Then add `CRON_SECRET` (any long random string) so only Vercel can run the email jobs. Without the database, the site still works: shortlists are kept in each member's browser and the email and feed features say they're not switched on yet.

## Accounts, roles and permissions

One login per person (an emailed sign-in link — no passwords). An account can hold several roles, and a portal profile only needs a free account; paid membership is separate and sits on the same account.

| Role | Can do | How you get it |
|---|---|---|
| Visitor | View public speaker profiles and summary sponsorship opportunities. Cannot see contact routes or budgets. | Not signed in |
| Registered user | Create and manage their own profile, save searches and shortlists. | Any account |
| Organiser | Post sponsorship opportunities, search sponsors and speakers, send enquiries. | Switch on in My account |
| Sponsor | Publish a sponsor profile, search opportunities (with budgets), send enquiries. | Switch on in My account |
| Speaker | Publish a speaker profile, receive and answer enquiries. | Switch on in My account |
| Admin | Approve, edit, hide and remove content, manage users and reports, view reporting. | `ADMIN_EMAILS`, or another admin |

The rules live in `lib/permissions.ts` (`can(user, permission)`), and every write goes through the checks in `app/portal/actions.ts`.

- **Sign-in:** `/login` → `/api/login` emails a 30-minute link → `/api/login/verify` creates the account if needed, signs the browser in for 90 days, and picks up a live Stripe membership on that email. Checkout creates or links the account too, so every member has one.
- **Profiles and opportunities** (`/portal/speaker`, `/portal/sponsor`, `/portal/opportunities`) start *waiting for approval*; owners' edits go back to the queue. Budgets, packages and contact routes are only sent to signed-in organisers, sponsors, admins and the owner — never to visitors' browsers.
- **Enquiries** (`/portal/enquire`, `/portal/inbox`): organisers → speakers and sponsors; sponsors and organisers → opportunities. Replies stay on the site; each new message is emailed. Email addresses are never shown.
- **Reports:** anyone can report a profile or opportunity; admins see them under Admin → Reports.
- **Admin** (`/admin`): approvals queue, all content (approve, edit, hide, remove), users (roles, suspend/restore), reports, reporting.
- **Settings:** `ADMIN_EMAILS` (comma-separated). Accounts need the member database (Upstash Redis — see above) and Resend for sign-in emails.

## Password-protecting the site before launch

Set `SITE_USERNAME` and `SITE_PASSWORD` in Vercel (Settings → Environment Variables) and redeploy: every page, image and API then asks for them with the browser's login box, and search engines are told not to index it. Vercel's scheduled jobs (`/api/cron`) still run. To launch, delete both variables and redeploy.
