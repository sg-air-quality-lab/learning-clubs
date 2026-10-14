# Learning Clubs (prototype)

An open-source toolkit for learning clubs: groups learn something together on one screen, try it with their hands, and work on a real problem, ideally with a club somewhere else.

This project started as a copy of the [Singapore Air Quality Dashboard](https://github.com/sg-air-quality-lab/air-quality-dashboard). The dashboard and its data pipeline are kept (now at `/data`) and feed the first lesson.

## Lessons

- `lessons/<id>/<language>.json` – each lesson is plain data in the standard format (`lib/lesson/schema.ts`), with eight building blocks: read, predict, estimate, sim, data, handson, discuss, challenge.
- `lib/lesson/registry.ts` – the list of lessons. Every lesson is validated at build time; a broken lesson stops the build with a clear list of what to fix.
- `components/lesson/` – the lesson player (one step per screen, made for a group around one screen).
- `components/sims/` – reviewed simulations, referenced by name from lessons. Lessons never ship their own code.
- `lib/lesson/datasets.ts` – datasets are bundled, so lessons work offline; live data is shown when online.
- `public/sw.js` – offline support: pages opened once keep working without internet.

To translate a lesson, copy its JSON file to a new language code (e.g. `id.json`) and translate the text fields only.

---

## Air quality data (from the original dashboard)

Open dashboard for Singapore air quality: official NEA readings (1-hour PM2.5 and 24-hour PSI per region), with citizen sensors to follow. Built for students, teachers and anyone curious.

Pick any time range, compare regions, drag across the chart to zoom into a period, download the data as CSV, and share a link to exactly the view you are looking at.

## How it works

```
data.gov.sg (NEA)  ──►  collector (GitHub Actions, hourly)  ──►  Supabase (Postgres)
                                                                     │
                                       browser  ◄──  Next.js API  ◄──┘
```

| Part | Where | What it does |
|---|---|---|
| `collector/` | GitHub Actions, every hour | Fetches the latest NEA values and stores them |
| `supabase/migrations/` | Supabase | Tables, security rules and the query function |
| `app/api/series` | Vercel | The only door to the database: validates each question, read-only |
| `app/`, `components/` | Vercel | The dashboard (Next.js + Apache ECharts) |

The database uses one generic time-series model (`devices`, `metrics`, `observations`), so new sensor types are new rows, not new tables.

### Security

- The browser never talks to the database. The website only uses the **publishable** (read-only) key, on the server.
- Only the collector uses the **secret** key, stored as a GitHub Actions secret. It never appears in code or in the browser.
- Row Level Security: the public can read only devices marked `is_public`; nobody can write without the secret key.
- Citizen sensors at home: store a coarsened location (about 1 km), never an address.

## Setup

1. **Database:** in the Supabase SQL editor, run `supabase/migrations/20261009120000_init.sql`.
2. **Collector:** in GitHub → Settings → Secrets and variables → Actions, add
   - `SUPABASE_URL` – e.g. `https://xxxx.supabase.co`
   - `SUPABASE_SECRET_KEY` – the secret key from Supabase → Project Settings → API Keys
3. **Reliable hourly start:** GitHub's own schedule often skips runs. Run `supabase/migrations/20261010100000_hourly_trigger.sql` in the Supabase SQL editor, then store a fine-grained GitHub token (repository *Actions: read and write* only) with
   `select vault.create_secret('<token>', 'github_dispatch_token');`
   Supabase then starts the collector at :10 every hour. The GitHub schedule stays as a backup.
4. **Backfill:** GitHub → Actions → *Collect NEA readings* → *Run workflow*, with a start date (e.g. `2026-09-01`).
5. **Website:** import the repository in Vercel and set the environment variables
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY` – the publishable key (read-only)

Without these variables the site runs in **demo mode** with a small sample of real readings from `data/demo.json`.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000 (demo mode unless .env.local is set)
npm test           # collector tests
SUPABASE_URL=... SUPABASE_SECRET_KEY=... npm run collect -- 2026-10-01 2026-10-09
```

## Connecting an airRohr sensor

Citizen sensors deliver their own readings to `POST /api/sensor/airrohr` (airRohr firmware: Configuration → APIs → "Send data to custom API", HTTPS, port 443, with a login and password).

1. In the Supabase SQL editor, create the device with an unlisted id and a coarse location, e.g.
   `insert into devices (id, name, kind, source, lat, lon, is_public) values ('citizen-xxxxxxxx', 'My balcony', 'citizen', 'airrohr', 1.36, 103.77, true);`
2. Set its password (at least 16 characters): `select set_device_token('citizen-xxxxxxxx', 'airrohr-<chip id>', '<password>');`
3. Enter the same login and password in the sensor.
4. Open the dashboard with `?sensor=citizen-xxxxxxxx` to see the sensor next to NEA, plus a calibration chart.

Only a hash of the password is stored. Raw readings are kept for 30 days, hourly averages permanently.

## Adding other data sources

1. Add a row to `devices` (and to `metrics` if it measures something new).
2. Add it to `lib/config.ts` with a fixed colour.
3. Write a small adapter that turns its data into `observations` rows.

## Data and licence

Contains information from the National Environment Agency, accessed via [data.gov.sg](https://data.gov.sg), licensed under the [Singapore Open Data Licence](https://data.gov.sg/open-data-licence).

Code: MIT licence.
