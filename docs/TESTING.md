# Testing

All automated tests use fixtures or a disposable MongoDB instance, not the deployed database or real Cloudinary uploads. Do not configure production credentials for tests.

## Run locally

- Backend: `cd server && npm test` (Jest/Supertest with coverage and an 81% minimum for statements, branches, functions and lines). Coverage excludes startup and CLI seed wrappers; the review seeding logic itself is tested.
- Frontend: `cd not-airbnb && npm test -- --watchAll=false --runInBand`.
- Browser: build the frontend, install Playwright Chromium with `npx playwright install chromium` from server, then `npm run test:e2e`. On Windows, `PLAYWRIGHT_CHANNEL=msedge` can select installed Edge; use `$env:PLAYWRIGHT_CHANNEL='msedge'` in PowerShell.

## Scenarios

Backend coverage includes authentication and cookie/session lifecycle, role/ownership isolation, invalid requests, image validation, Cloudinary adapter failures, public search, cart operations, concurrent and idempotent booking requests, overlapping-date protection, simulated payments, verified-stay reviews, private messaging and support. Abuse regressions exercise limits across app instances, independent users, upload rejection before processing, login normalization, retry headers, counter contention, DB failure, conversation blocks, other-session revocation, oversized bodies, duplicate reservations, and idempotent demo seeding.

Frontend tests cover sign-in and registration, protected routes, cart partial failures, simulated payments, profile failure recovery, other-session revocation, support throttling/retry, booking filters and role-specific actions, messaging blocks and failed sends, escaped hostile text, draft isolation across conversations, price-filter clearing, demo review labels, and accessible workspace navigation.

The browser scenario uses separate host and traveler sessions to create a property, upload a photo, book, accept, simulate payment, exchange messages, update a profile, revoke other sessions, block/unblock messaging, and report a concern. It captures the four workspace screens at 390px and 1440px and checks for horizontal overflow. The screenshots are artifacts for visual inspection, not pixel-diff assertions.

GitHub Actions runs backend, frontend/build, and browser jobs on pushes and pull requests. Browser artifacts and backend coverage are uploaded. Browser tests require a browser installation and the MongoDB test binary. These checks do not measure production capacity or constitute a security audit.
