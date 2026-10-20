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
| `UPLOAD_STORAGE=cloudinary` | Production backend | Store photos outside Render's temporary filesystem |
| `CLOUDINARY_CLOUD_NAME` | Backend environment | Cloudinary product environment name |
| `CLOUDINARY_API_KEY` | Backend environment | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Backend environment | Cloudinary API secret; keep private |
| `UPLOAD_DIR` | Local backend only | Local photo directory when UPLOAD_STORAGE=local |
| API hostname | `not-airbnb/vercel.json` | Replace the explicit REPLACE-WITH-YOUR-API-HOST placeholder |

Session tokens are random opaque values stored in HttpOnly cookies; only their SHA-256 hashes are stored in MongoDB. No JWT secret is needed. Never put database credentials into frontend variables.

## Free demo deployment: Vercel + Render Docker + Atlas + Cloudinary

Use Atlas **Free**, Cloudinary **Free**, Render **Free** and Vercel **Hobby** (personal/noncommercial use). Choose actual free plans, not paid trials. Stay within each provider's usage limits. Use the included Vercel address; no custom domain purchase is required. Render's free backend sleeps after inactivity, so the first request can take about a minute. No persistent Render disk is needed with Cloudinary.

1. **Cloudinary:** create a Free account for Image & Video APIs. Find your cloud name, API key and API secret in its console/API Keys settings. Fill the corresponding blank fields in `server/.env` and change `UPLOAD_STORAGE=local` to `UPLOAD_STORAGE=cloudinary` to test remotely stored uploads locally. Keep these values private; no unsigned upload preset is required. [Cloudinary upload documentation](https://cloudinary.com/documentation/node_image_and_video_upload).
2. **GitHub:** commit and push the Cloudinary changes and `render.yaml`. The private `.env` files remain ignored. Your earlier backend commit alone does not include this change.
3. **Vercel:** import the repository on the Hobby plan, root `not-airbnb`, framework Create React App, build `npm run build`, output `build`. Note the assigned HTTPS production URL. The frontend can deploy before the API, but data/login will not work until steps 4-6 are completed. [Vercel CRA documentation](https://vercel.com/docs/frameworks/frontend/create-react-app).
4. **Render:** choose New > Blueprint, connect the repository and use the root `render.yaml`. It declares one Docker web service on the **Free** plan and no disks/databases. Enter `MONGODB_URI` from your private file, `FRONTEND_URL` as the exact Vercel origin (no trailing slash), and the three Cloudinary settings. The blueprint sets `NODE_ENV=production`, `COOKIE_SECURE=true`, `UPLOAD_STORAGE=cloudinary` and `TRUST_PROXY=1`. The latter trusts Render's direct ingress proxy; revisit it if adding another proxy layer. Alternatively, create a Web Service manually using root `server`, Dockerfile `./Dockerfile`, context `.`, Free compute, and health check `/api/health`. [Render Docker documentation](https://render.com/docs/docker).
5. **Atlas network access:** add the outbound IP ranges shown for the Render service to your Atlas access list. A local connection succeeding does not authorize Render's IP addresses. Redeploy/restart if the first startup timed out. Check `https://YOUR-API-HOST/api/health` returns `{ "ready": true }`. [Atlas network access documentation](https://www.mongodb.com/docs/atlas/security/ip-access-list/).
6. **Connect frontend to backend:** replace `REPLACE-WITH-YOUR-API-HOST` in `not-airbnb/vercel.json` with the actual Render service hostname, commit and push. Vercel redeploys. The `/api/*` rewrite keeps browser session traffic same-origin; photo URLs point directly to Cloudinary's HTTPS CDN. The SPA fallback supports direct links and refreshes.
7. **Verify the public site:** register host/traveler accounts; upload a photo; create a property; book, accept and simulate payment; test messaging and logout/login. Confirm the uploaded photo survives a backend redeploy. Use separate resources for preview deployments: mutations are allowed only from the configured frontend origin.

Production defaults to Cloudinary storage and fails startup if credentials are missing instead of silently saving photos to an ephemeral filesystem. Local development/Docker Compose still defaults to local disk and needs no Cloudinary account. Existing local photos are not migrated automatically; re-upload any photos previously stored under `/api/uploads/` before sharing a hosted listing.

No provider accounts or paid services have been created by the setup scripts. Hosted deployment still requires your account connections, credentials and actual service URLs. Free-plan limits: [Render](https://render.com/docs/free), [Atlas](https://www.mongodb.com/pricing), [Cloudinary](https://cloudinary.com/pricing), [Vercel](https://vercel.com/docs/plans/hobby).

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
- This is a single-instance demo deployment with shared Cloudinary photo storage. Large catalogs/conversations would need pagination and separate history collections.

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

Verified during implementation: 23 backend integration tests, 9 frontend tests and a production build passed. Backend coverage measured 99.31% statements, 95.97% branches, 100% functions and lines. The real-browser flow passed in headless Edge, including clean test-server teardown. Docker Compose configuration validates, but the local Docker daemon was unavailable, so image builds/container startup have not been verified here.

Dependency note: compatible upgrades and removal of unused packages reduced the inherited dependency issues. The legacy Create React App build/test toolchain still reports advisories, and React Router 6 has reported advisories; the app uses fixed internal destinations and does not implement SSR hydration. Do not run `npm audit fix --force` blindly: npm proposes replacing react-scripts with a nonfunctional version. A build-tool/router migration should be handled and tested separately. The backend production dependency audit was clean after the image-processing update; rerun npm audit --omit=dev when updating dependencies. The backend development dependency tree still reports 19 moderate advisories in testing dependencies.
