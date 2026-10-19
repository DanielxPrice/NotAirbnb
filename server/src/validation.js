const { z } = require('zod');
const text = (max) => z.string().trim().min(1).max(max);
const email = z.email().max(254).transform(value => value.toLowerCase());
const password = z.string().min(8).refine(value => Buffer.byteLength(value) <= 72, 'Password must be at most 72 bytes');
const integer = (min, max) => z.coerce.number().int().min(min).max(max);
const date = z.iso.date();
const schemas = {
  register: z.object({ email, password, name: text(80).optional(), role: z.enum(['traveler', 'host']).default('traveler') }),
  login: z.object({ email, password: z.string().min(1).max(200) }),
  profile: z.object({ name: text(80) }),
  listing: z.object({
    title: text(150), location: text(200), description: text(5000),
    price: z.coerce.number().positive().max(10000).refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 0.000001, 'Use at most two decimal places'),
    bedrooms: integer(0, 100), bathrooms: integer(1, 100), maxGuests: integer(1, 100),
    images: z.array(z.string().max(500)).min(1).max(10),
    amenities: z.array(text(100)).max(30).default([])
  }),
  stay: z.object({ checkIn: date, checkOut: date, guests: integer(1, 100) }),
  review: z.object({ rating: integer(1, 5), comment: z.string().trim().max(2000).default('') }),
  message: z.object({ text: text(2000) }),
  support: z.object({ subject: text(200), message: text(5000) }),
  status: z.object({ status: z.enum(['accepted', 'denied', 'cancelled']) })
};
function fail(status, message) { throw Object.assign(new Error(message), { status }); }
function id(value) {
  if (!/^[a-f\d]{24}$/i.test(value || '')) fail(400, 'Invalid ID');
  return value;
}
function stayDetails(body, listing) {
  const data = schemas.stay.parse(body);
  const checkIn = new Date(data.checkIn);
  const checkOut = new Date(data.checkOut);
  const nights = (checkOut - checkIn) / 86400000;
  if (checkIn < new Date(new Date().toISOString().slice(0, 10)) || nights <= 0 || nights > 365) fail(400, 'Choose future dates for a stay of 1–365 nights');
  if (data.guests > listing.maxGuests) fail(400, 'Too many guests');
  return { checkIn, checkOut, guests: data.guests, totalCents: Math.round(listing.price * 100) * nights };
}
module.exports = { schemas, fail, id, stayDetails };
