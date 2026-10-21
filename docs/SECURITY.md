# Security and abuse controls

## Implemented defenses

- Render supplies infrastructure-level DDoS protection: https://render.com/docs/ddos-protection . Application limits complement it; they do not guarantee availability against a distributed attack.
- A per-process IP limiter runs before JSON parsing: 200 API requests/minute and 30 login/registration attempts/15 minutes. IPv6 grouping uses express-rate-limit defaults. Never trust arbitrary forwarded headers; TRUST_PROXY must match the actual proxy chain. Vercel proxy traffic may share apparent IPs, so IP limits are coarse rather than reliable per-person quotas.
- MongoDB-backed, atomic per-account counters survive restarts and are shared across backend instances. Limits: 30 messages/minute; 20 uploads/hour; 5 support requests/hour; 30 booking/cart mutations/hour; 40 listing mutations/hour; 20 thread creations/hour; 10 review attempts/hour; 20 profile/session/block changes/hour. Login also allows 20 attempts per normalized email/15 minutes, regardless of IP. Fixed windows can permit a burst at a window boundary. Attempts, including validation failures, count. HTTP 429 includes Retry-After. TTL indexes reclaim expired counters; the window key prevents stale counters blocking a later window. Counters fail closed if the DB fails.
- Passwords are bcrypt-hashed. Opaque sessions are random, stored hashed, expire in seven days, and use HttpOnly/SameSite cookies (Secure in production). Logout revokes the session; account settings can revoke other sessions without disclosing their tokens.
- Mutation requests require the application header and an allowed browser Origin. Role and ownership checks protect listings, uploads, carts, bookings, messages and payments. User-supplied totals, roles in profile updates, and reviewer identities are not trusted.
- Either conversation participant can block messaging in both directions. Each may remove only their own block. Blocking is per conversation, not a global account ban. A report link opens Support with the conversation reference; reports are saved for manual review, not automatically adjudicated or emailed.
- Duplicate pending bookings for the same user, property and dates are atomically rejected even with new idempotency keys; retries with the original key remain idempotent. Booking and message arrays have 1,000-record caps to bound document growth. Accepted stays cannot overlap. Genuine reviews still require a completed paid (simulated) stay and are limited to one per user/property.
- Images have a 5 MB limit, decoded format checks, a 25-megapixel cap, resizing, metadata stripping, and re-encoding before Cloudinary upload. Upload quotas are checked before image processing.
- JSON is capped at 100 KB. Malformed JSON is rejected without echoing content. Helmet headers, API no-store responses, escaped React text, and generic server errors remain enabled. The public listing query excludes private booking arrays from its DB result.
- HTTP request timeout is 30 seconds, header timeout 15 seconds, and keep-alive timeout 5 seconds.

## Operational limits and next steps

No application can promise to prevent all DDoS or abuse. IP limits currently live in process memory, and do not coordinate across replicas; account limits do. Monitor provider metrics, 429/5xx rates, MongoDB usage, and Cloudinary quotas. The app has no CAPTCHA, email verification, global account ban system, moderation dashboard, automated report response, or billing-grade payment system. Review reports manually in the Support collection. If traffic increases, add edge bot rules and alerting, email verification, pagination, and a moderation workflow before opening broad public registration. No additional paid service is required for this change.

Never load-test or send DoS traffic to the hosted service. Rate-limit tests use isolated local MongoDB and Supertest. Render explicitly prohibits DoS testing: https://render.com/docs/penetration-testing .

## Demo reviews

`npm run seed:reviews -- --host=EMAIL` previews the active listing count. Add `--apply` to insert three clearly labeled fictional reviews per matching property. Repeated runs do not duplicate them. `--remove-demo` removes only reviews created by this seed version; genuine reviews are left intact. The script uses server/.env and never prints credentials. Run only against the intended database. It never creates bookings, payments, or fake accounts, and the public review API cannot set the demo flag.
