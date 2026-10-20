# REST API

All paths below start with `/api`. JSON errors have `{ "error": "message" }`. Unsafe methods must send `X-Requested-With: NotAirbnb`. If an Origin header is present it must match `FRONTEND_URL`. Browser requests include cookies; session cookies use path `/api`, HttpOnly and SameSite=Lax.

| Method/path | Access | Request / behavior |
| --- | --- | --- |
| GET /health | Public | 200 when database is connected, otherwise 503 |
| POST /auth/register | Public | email, password (at least 8 characters, at most 72 bytes), optional name, role (host/traveler); returns user and session cookie |
| POST /auth/login | Public | email, password; rotates session and returns user |
| POST /auth/logout | Public | Revokes current session, clears cookie, returns 204 |
| GET /auth/me | Account | Returns user; no password hash |
| PATCH /auth/me | Account | name; role/email changes ignored |
| GET /listings | Public | q, minPrice, maxPrice, guests, bedrooms, rating query filters; returns listings |
| GET /listings/:id | Public | Returns listing with public host name and reviews |
| POST /listings | Host | title, location, description, price, bedrooms, bathrooms, maxGuests, images, amenities |
| PUT /listings/:id | Owner | Same complete editable listing payload; cannot transfer ownership |
| DELETE /listings/:id | Owner | Archives property, 204 |
| POST /listings/:id/reviews | Completed paid guest | rating 1?5, optional comment |
| POST /uploads | Host | multipart/form-data field image; returns owned HTTPS Cloudinary URL in hosted mode, or a local /api/uploads URL in local mode |
| GET /uploads/:file | Public | Locally stored re-encoded WebP image (Cloudinary photos use their returned HTTPS URL) |
| GET /cart | Account | Returns owned items and current calculated totals |
| POST /cart | Account | propertyId, checkIn/checkOut as YYYY-MM-DD, guests |
| DELETE /cart/:id | Owner | Removes item, 204 |
| POST /cart/submit | Account | Returns results with booking or error per item |
| GET /bookings | Account | Returns own reservations and requests on owned properties |
| POST /bookings | Account | propertyId, checkIn, checkOut, guests; Idempotency-Key header required (8?100 alphanumeric, underscore or hyphen characters) |
| PATCH /bookings/:id | Owner/guest | status accepted/denied by host; cancelled by guest; pending requests only |
| POST /payments/simulate/:bookingId | Booking guest | Empty body only; marks an accepted booking paid with paymentMode=simulated. No card data or real charge. Retries return the same result. |
| GET /threads | Account | Returns only conversations belonging to the user |
| POST /threads | Account | propertyId; finds or starts conversation with host |
| POST /threads/:id/messages | Participant | text, 1?2,000 characters |
| POST /support | Account | subject, message; uses authenticated email and returns ticket reference |

IDs are MongoDB ObjectId strings. Public listing responses never include private booking histories or account emails. Client-supplied totals, payment state, ownership and privileged role changes are not accepted.

Example booking payload:

```json
{
  "propertyId": "REPLACE_WITH_LISTING_ID",
  "checkIn": "2030-06-01",
  "checkOut": "2030-06-04",
  "guests": 2
}
```

Bookings use pending ? accepted ? paid, or pending ? denied/cancelled. Accepted/paid date intervals are half-open, so another guest can check in on the previous guest's checkout day.
