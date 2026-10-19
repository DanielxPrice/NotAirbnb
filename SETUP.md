# NotAirbnb setup and deployment

This repository now contains the React frontend in `not-airbnb/` and a Node.js/Express/MongoDB API in `server/`. Existing pages retain the rose/gray styling. New pages expose carts, booking management, account settings and support.

## Start everything locally with Docker

1. Start Docker Desktop with **Linux containers**.
2. From the repository root, run:

```sh
docker compose up --build
```

3. Open **http://localhost:3000**.
4. Register a **Host**, add a property and upload at least one photo. In a separate browser profile/private window, register a **Traveler** to book it.
5. Use Bookings in the host account to accept or deny requests. Travelers can simulate payment for accepted requests without entering card details.

No external credentials are required for accounts, listings, carts, uploads, bookings, messaging or support with this local setup. MongoDB and photos persist in named Docker volumes. `docker compose down` stops the app and retains data; adding `--volumes` deletes the stored database and photos. Only the frontend port is published; MongoDB stays on Docker's private network. This Compose file is a local development setup, not an internet-facing database deployment.


## Run without Docker

Use Node.js 22 or newer and a local MongoDB or Atlas database.

Terminal 1:

```sh
cd server
npm ci
```

Copy `server/.env.example` to `server/.env`, set `MONGODB_URI`, then:

```sh
npm run dev
```

Terminal 2:

```sh
cd not-airbnb
npm ci
npm start
```

Open http://localhost:3000. CRA proxies `/api` to port 4000. On Windows PowerShell, use `npm.cmd` instead of `npm` if execution policy blocks npm.ps1.

Optional seed: set `SEED_HOST_EMAIL` and `SEED_HOST_PASSWORD` in `server/.env`, then run `npm run seed` from `server/`. This creates two sample properties for that host and never overwrites existing listings or creates fake paid bookings. No preset account password is committed.

## External settings to add later

| Setting | Where | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | Backend environment | Your Atlas connection string, including database name |
| `FRONTEND_URL` | Backend environment | Exact frontend origin, e.g. https://your-site.vercel.app, with no trailing slash |
| `COOKIE_SECURE=true` | Production backend | HTTPS-only session cookies |
| `NODE_ENV=production` | Production backend | Enforces HTTPS frontend/cookie configuration at startup |
| `TRUST_PROXY` | Backend environment | Number of trusted proxies on the network path; local Compose sets 1 |
| `UPLOAD_DIR` | Backend environment | Directory on durable storage, e.g. /app/uploads |
| API hostname | `not-airbnb/vercel.json` | Replace the explicit REPLACE-WITH-YOUR-API-HOST placeholder |

Session tokens are random opaque values stored in HttpOnly cookies; only their SHA-256 hashes are stored in MongoDB. No JWT secret is needed. Never put database credentials into frontend variables.

## Suggested public deployment: Vercel + Render Docker + MongoDB Atlas

1. **Atlas:** create the database and a database user with access to this app's database. Add the backend host's outbound IP ranges to Atlas's network access list. [Atlas network access documentation](https://www.mongodb.com/docs/atlas/security/ip-access-list/).
2. **Render:** create a Docker web service with root directory `server` and Dockerfile `./Dockerfile`. Set the backend variables above; use `/api/health` as the health check. The API listens on Render's `PORT` on all interfaces. Determine `TRUST_PROXY` for your actual proxy chain rather than blindly trusting arbitrary forwarded IPs.
3. **Photo storage:** attach a persistent disk at `/app/uploads` and set `UPLOAD_DIR=/app/uploads`. Ensure it is writable by the container's `node` user (UID 1000). Render's ordinary filesystem is ephemeral; persistent disks require a paid service and support one instance. [Render disk documentation](https://render.com/docs/disks).
4. **Vercel:** import this repository, set root directory to `not-airbnb`, framework to Create React App, build command to `npm run build`, and output to `build`. Replace the API hostname in `vercel.json` before deploying. [Vercel CRA documentation](https://vercel.com/docs/frameworks/frontend/create-react-app).
5. Set the backend's `FRONTEND_URL` to the final Vercel HTTPS origin and enable secure cookies. The `/api/*` rewrite keeps browser traffic same-origin, including cookies and uploaded images. The SPA fallback supports direct links and refreshes.
6. Register test accounts and verify uploads, logout/login, cart persistence, host acceptance and messaging at the public URL. Confirm a photo survives a backend redeploy. Use a separate backend/database for preview deployments: the backend accepts mutations only from its configured frontend origin.

Nothing has been published and no paid services have been created. The Vercel API placeholder must be replaced before the deployment can function.

## Simulated payments

This is a demo payment flow only. There is no payment provider, hosted checkout, card form, card storage or real charge capability. No payment credentials or external setup are required.

1. Submit a booking as a traveler and accept it as the host.
2. In the traveler's Bookings page, click **Simulate Payment**.
3. The booking displays **Paid (simulated)** and a confirmation states that no money was charged.

The authenticated API accepts only an empty request body, checks booking ownership and accepted status, then atomically records a simulated payment and timestamp. Retries and double clicks keep the same result. The existing paid status is retained for booking/review rules, with an explicit paymentMode of simulated; a review still requires the stay to have ended.

## Booking rules and scope

- Registration selects host or traveler; both may book another host's property. Only hosts can publish listings.
- Check-in must be today or later, checkout must be later, stays are limited to 365 nights, and guests cannot exceed capacity.
- Pending requests do not reserve inventory. Host acceptance atomically reserves dates and prevents overlapping accepted/paid bookings.
- Hosts can accept/deny pending requests; travelers can cancel their own pending requests. Accepted bookings retain their original price even if the listing changes.
- Accepted bookings reserve dates until paid; automatic hold expiration, cancellation after acceptance, refunds and host payouts are not implemented.
- Reviews require a completed stay with a simulated payment and are limited to one per traveler/property.
- Archiving removes a listing from search without deleting existing bookings.
- Cart submissions commit per item: successful items are removed and failures remain visible. Request keys prevent duplicate booking writes.
- Messages persist and refresh every five seconds; bookings refresh every ten seconds. A conversation is capped at 1,000 messages.
- Support submissions are stored in MongoDB with an on-screen reference; outbound email and an admin support dashboard are not configured.
- Email verification and password-reset email are not implemented. Saved card details, real charges and marketplace payouts are intentionally unsupported.
- Photos are decoded and saved as WebP, at most 5 MB input and 25 megapixels, with up to ten images per property. Unattached photos are not automatically garbage-collected.
- This is a single-instance project deployment. Large catalogs/conversations would need pagination, separate history collections and shared object storage.

## Verification

Backend integration tests use an isolated MongoDB process via mongodb-memory-server, never your configured database. The first run may download a MongoDB binary. Payment tests use the actual simulation endpoint and require no external service.

```sh
cd server
npm test
```

Coverage enforces **81% statements, branches, functions and lines** across API application modules. The process entrypoint and optional seed script are excluded; routes, models, validation, authentication, uploads and payments are included. Reports are written to `server/coverage/`.

Frontend:

```sh
cd not-airbnb
npm test -- --watchAll=false --runInBand
npm run build
```

Real-browser test (build the frontend first):

```sh
cd server
npx playwright install chromium
npm run test:e2e
```

On Windows with Edge installed, use `$env:PLAYWRIGHT_CHANNEL='msedge'` before `npm.cmd run test:e2e` instead of downloading Chromium. The browser test starts a disposable MongoDB/API and serves the production build, then exercises separate host/traveler sessions, uploads, carts, booking acceptance, simulated payment persistence, messaging, account persistence and mobile overflow.

GitHub Actions runs backend coverage and frontend tests/build. The browser suite is available locally; it is not in the default CI job.

Verified during implementation: 20 backend integration tests, 9 frontend tests and a production build passed. Backend coverage measured 99.03% statements, 94.23% branches, 100% functions and lines. The real-browser flow passed in headless Edge, including clean test-server teardown. Docker Compose configuration validates, but the local Docker daemon was unavailable, so image builds/container startup have not been verified here.

Dependency note: compatible upgrades and removal of unused packages reduced the inherited dependency issues. The legacy Create React App build/test toolchain still reports advisories, and React Router 6 has reported advisories; the app uses fixed internal destinations and does not implement SSR hydration. Do not run `npm audit fix --force` blindly: npm proposes replacing react-scripts with a nonfunctional version. A build-tool/router migration should be handled and tested separately. The backend production dependency audit reported zero vulnerabilities after the image-processing update. The backend development dependency tree still reports 19 moderate advisories in testing dependencies.
