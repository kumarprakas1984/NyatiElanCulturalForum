# Nyati Elan Cultural Forum — Project Memory

Long-term context for anyone (human or agent) picking up this repository. Keep it
updated when the architecture, data model, or deployment story changes.

## What this is

A community web app for the **Nyati Elan Cultural Forum**, a residential society
that runs an annual festival (Ganeshotsav) collection drive. The app lets
residents see where the money goes and lets volunteer admins record door-to-door
contributions from a phone while standing at a flat door.

It is a **static, no-build site** deployed on Netlify (project slug
`nyatielancultural`). There is no bundler, no `package.json`, no framework and no
server code in this repo — every page is a hand-written HTML file with inline CSS
and JavaScript, styled with the Tailwind CDN build plus the Inter font and Font
Awesome. All persistence lives in Google Workspace, reached through a Google Apps
Script web app (see below).

## Files

| File | Role |
| --- | --- |
| `index.html` | Tiny landing shim: meta-refresh + `location.replace` to `app.html`. |
| `app.html` | The whole application — ~2.6k lines of markup, styles and JS in one file. |
| `participants.html` | Standalone, fast, public list of cultural-activity registrations with search + activity/age filters. No login. |
| `privacy.html`, `terms.html` | Policy pages required for Google OAuth verification; linked from the app footer. |
| `googlef3942674ad4e253c.html` | Empty Google Search Console site-verification file. Do not delete or rename. |
| `Code.gs` | Source of the Google Apps Script backend. **Not executed by Netlify** — it is kept here for version control and must be pasted/pushed into the Apps Script project and re-deployed for changes to take effect. |

## Architecture

```
browser (app.html / participants.html)
  │  fetch ?action=getAllData        (GET, read path)
  │  fetch action=updateSheet|saveExpense (POST, Content-Type: text/plain)
  ▼
Google Apps Script web app  (Code.gs → doGet / doPost)
  ▼
Google Sheet 1KGn8...cLqT0  tabs: Residents, Expenses, Events, Summary, Admins
  +  Google Drive folder (event photos)
```

- `Content-Type: text/plain` on POSTs is deliberate — Apps Script `doPost` rejects
  a JSON content type with a CORS preflight failure. Don't "fix" it.
- Front-end config (Apps Script URL, Google OAuth client ID, UPI payee details,
  Drive folder ID, OAuth scopes) lives in the `CONFIG` object at the top of the
  `<script>` block in `app.html`. `participants.html` has its own copy of the API
  URL.
- Backend config (spreadsheet ID, tab names, optional WhatsApp gateway
  credentials) lives in the `CONFIG` object at the top of `Code.gs`. The
  automated-WhatsApp path is present but disabled (`WHATSAPP_AUTOMATION.ENABLED =
  false`); the app instead opens a prefilled `wa.me` / `web.whatsapp.com` link so
  the volunteer's own phone sends the receipt.

## `app.html` structure

Four tabs, switched by `switchTab()` — only the first is gated:

1. **Admin** (`#admin-view`) — signed-in volunteers only. Pick a building, get a
   colour-coded flat grid (grey = no record, amber = unpaid, green = paid), or use
   the debounced quick search to jump straight to a flat. Opening a flat shows the
   resident modal: name, mobile, amount (with presets and a "add to existing"
   toggle), payment mode, date, comment, an optional dynamic UPI QR code, and a
   WhatsApp receipt button. There is also an expense-entry modal with receipt
   upload to Drive.
2. **Resident** (`#resident-view`) — the public default tab. Financial summary
   cards plus two sub-tabs: festival expenses and building-wise collections.
3. **Gallery** (`#gallery-view`) — thumbnails of the shared Drive event folder.
4. **Events** (`#events-view`) — festival notice board, filterable by festival,
   with the Ganeshotsav cultural-activities registration call to action.

Cross-cutting behaviours worth knowing before editing:

- **Stale-while-revalidate cache.** On load the app renders instantly from
  `localStorage` (`nyati-community-data-v2`), then refetches in the background.
  Fetches have a 20s abort timeout and are de-duplicated via `activeFetchPromise`.
- **Loader discipline.** The overlay is visible in the initial markup, so *every*
  init path must call `hideLoaderOverlay()` or the user is stuck behind a white
  screen. Writes claim it through the `showBlockingLoader` /
  `hideBlockingLoader` pair, which refcounts via `pendingBlockingOps` so a
  background refresh cannot dismiss it mid-write. Preserve this when adding
  async work.
- **Region-scoped admins.** `BUILDINGS` (floors × flats per floor) and
  `BUILDING_REGIONS` are hard-coded in `app.html`. Admin emails and their region
  (`N`, `SE`, `BOTH`, or blank = all) come from the Sheet's `Admins` tab.
  `getAccessibleBuildings()` / `canAccessBuilding()` enforce it; North-region
  buildings also have the UPI QR suppressed, and the financial summary is shown
  only to `SE`/`BOTH` admins.
- **Auth.** Google Identity Services one-tap; the ID token is decoded client-side
  and the email checked against the admin list. This is *convenience* gating, not
  security — the Apps Script endpoint is the real trust boundary. Anyone who is
  not on the admin list is dropped back to the resident view.
- **Tolerant sheet parsing.** Both tiers match columns by fuzzy, lower-cased
  header substrings and `parseSummaryData()` accepts messy values (`₹11K`,
  commas, per-year columns). Volunteers edit these sheets by hand, so keep
  parsing forgiving and never assume fixed column positions or that a year column
  can be overwritten — historical columns like `2025` are preserved on update.
- All user-supplied strings pass through `escapeHtml()` before being injected into
  template-literal HTML. Keep doing this.

## `Code.gs` surface

- `doGet` — `action=getAllData` (returns all five tabs), `action=ping`.
- `doPost` — `getAllData`, `updateSheet` (upsert a resident row, matched on
  building + flat), `saveExpense` / `addExpense`.
- Editor-only helpers, run manually and not part of the request path:
  `testFetch`, `createGanpatiCulturalActivitiesForm`,
  `updateGanpatiCulturalActivitiesForm` (create/patch the registration Google Form
  whose responses feed the `Events` tab and `participants.html`).
- Missing sheets/columns are created on demand (`getOrCreateSheet`, and the
  `Payment Mode` column is appended if absent).

## Working on this repo

- No build step and no dependencies to install; `netlify dev --port 8889` serves
  the files as-is. Do not add build commands or artifacts.
- Backend changes to `Code.gs` need a manual Apps Script deployment. If the
  deployment URL changes, update `CONFIG.API_URL` in **both** `app.html` and
  `participants.html`.
- Bump `CACHE_KEY` in `app.html` (and `nyati-participants-v1` in
  `participants.html`) whenever the cached payload shape changes, or returning
  users will render stale, mismatched data.
- Amounts are INR and formatted with `toLocaleString('en-IN')`.
