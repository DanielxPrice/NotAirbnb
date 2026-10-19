const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const sharp = require('sharp');
const fs = require('fs/promises');
const path = require('path');
const { createApp } = require('../src/app');
const { User, Session, Listing, Cart, Thread, Upload, Support } = require('../src/models');

const origin = 'http://localhost:3000';
const uploadDir = path.join(__dirname, '../.test-uploads');
const app = createApp({ disableRateLimit: true, uploadDir });
let mongo, host, guest, other, listing, passwordHash, png;
const date = offset => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
const stay = () => ({ propertyId: String(listing._id), checkIn: date(10), checkOut: date(12), guests: 2 });
const listingData = () => ({ title: 'Beach House', location: 'Miami', description: 'A quiet place by the beach', price: 125.25, bedrooms: 2, bathrooms: 1, maxGuests: 4, images: ['/api/uploads/fixture.webp'], amenities: ['WiFi'] });
const call = (actor, method, url, body, application = app) => {
  const req = request(application)[method]('/api' + url).set('Origin', origin).set('X-Requested-With', 'NotAirbnb');
  if (actor) req.set('Cookie', `session=${actor.token}`);
  if (body !== undefined) req.send(body);
  return req;
};
async function actor(email, role) {
  const user = await User.create({ email, name: email.split('@')[0], role, passwordHash });
  const token = crypto.randomBytes(32).toString('hex');
  await Session.create({ user: user._id, tokenHash: crypto.createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 3600000) });
  return { user, token };
}
async function book(actorValue = guest, overrides = {}, key = crypto.randomUUID()) {
  const response = await call(actorValue, 'post', '/bookings', { ...stay(), ...overrides }).set('Idempotency-Key', key).expect(201);
  return response.body.booking;
}
async function accept(booking) { return call(host, 'patch', '/bookings/' + booking.id, { status: 'accepted' }).expect(200); }
beforeAll(async () => {
  mongo = await MongoMemoryServer.create({ binary: { downloadDir: path.join(__dirname, '../.mongodb-binaries') } });
  await mongoose.connect(mongo.getUri());
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));
  passwordHash = await bcrypt.hash('Password123!', 12);
  png = await sharp({ create: { width: 20, height: 20, channels: 3, background: '#ff0055' } }).png().toBuffer();
});
beforeEach(async () => {
  await Promise.all(Object.values(mongoose.models).map(model => model.deleteMany({})));
  [host, guest, other] = await Promise.all([actor('host@example.com', 'host'), actor('guest@example.com', 'traveler'), actor('other@example.com', 'host')]);
  listing = await Listing.create({ ...listingData(), host: host.user._id });
  await Upload.create({ user: host.user._id, url: '/api/uploads/fixture.webp' });
});
afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
  await fs.rm(uploadDir, { recursive: true, force: true });
});

describe('accounts and session protection', () => {
  test('registers, hashes passwords, restores sessions and revokes logout tokens', async () => {
    const agent = request.agent(app);
    const response = await agent.post('/api/auth/register').set('X-Requested-With', 'NotAirbnb').send({ email: 'NEW@example.com', password: 'Password123!', role: 'host' }).expect(201);
    expect(response.body.user).toMatchObject({ email: 'new@example.com', role: 'host', name: 'new' });
    expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(response.body.user.passwordHash).toBeUndefined();
    const stored = await User.findOne({ email: 'new@example.com' }).select('+passwordHash');
    expect(stored.passwordHash).not.toBe('Password123!');
    expect(await bcrypt.compare('Password123!', stored.passwordHash)).toBe(true);
    await agent.get('/api/auth/me').expect(200);
    const cookie = response.headers['set-cookie'][0].split(';')[0];
    await agent.post('/api/auth/logout').set('X-Requested-With', 'NotAirbnb').expect(204);
    await request(app).get('/api/auth/me').set('Cookie', cookie).expect(401);
    await call(null, 'post', '/auth/logout').expect(204);
  });
  test('authenticates only correct passwords, rotates sessions and updates account names', async () => {
    await call(null, 'post', '/auth/login', { email: 'guest@example.com', password: 'wrong' }).expect(401);
    await call(null, 'post', '/auth/login', { email: 'missing@example.com', password: 'wrong' }).expect(401);
    const result = await call(guest, 'post', '/auth/login', { email: 'GUEST@example.com', password: 'Password123!' }).expect(200);
    expect(result.body.user.id).toBe(String(guest.user._id));
    await call(guest, 'get', '/auth/me').expect(401);
    const cookie = result.headers['set-cookie'][0].split(';')[0];
    const updated = await request(app).patch('/api/auth/me').set('Cookie', cookie).set('X-Requested-With', 'NotAirbnb').send({ name: 'Updated', role: 'host' }).expect(200);
    expect(updated.body.user).toMatchObject({ name: 'Updated', role: 'traveler' });
    await call(null, 'get', '/auth/me').expect(401);
  });
  test('rejects duplicate/invalid accounts, expired sessions and cross-origin mutations', async () => {
    await call(null, 'post', '/auth/register', { email: 'guest@example.com', password: 'Password123!' }).expect(409);
    for (const body of [{}, { email: 'bad', password: 'short' }, { email: 'x@example.com', password: 'x'.repeat(73) }, { email: 'x@example.com', password: 'Password123!', role: 'admin' }]) await call(null, 'post', '/auth/register', body).expect(400);
    await request(app).post('/api/auth/login').send({}).expect(403);
    await call(null, 'post', '/auth/login', {}).set('Origin', 'https://evil.example').expect(403);
    await Session.updateMany({ user: guest.user._id }, { expiresAt: new Date(0) });
    await call(guest, 'get', '/auth/me').expect(401);
    await call({ token: 'invalid' }, 'get', '/auth/me').expect(401);
    const secure = createApp({ disableRateLimit: true, secureCookies: true });
    const response = await call(null, 'post', '/auth/register', { email: 'secure@example.com', password: 'Password123!', name: 'Secure' }, secure).expect(201);
    expect(response.headers['set-cookie'][0]).toContain('Secure');
  });
});

describe('property management, discovery and image uploads', () => {
  test('publishes public data and filters without exposing bookings or private email', async () => {
    await book();
    const result = await call(null, 'get', '/listings?q=miami&minPrice=100&maxPrice=200&guests=2&bedrooms=2&rating=0').expect(200);
    expect(result.body.listings).toHaveLength(1);
    expect(result.body.listings[0]).not.toHaveProperty('bookings');
    expect(result.body.listings[0].host).not.toHaveProperty('email');
    expect((await call(null, 'get', '/listings?q=missing').expect(200)).body.listings).toHaveLength(0);
    await call(null, 'get', '/listings?minPrice=nope').expect(400);
    await call(null, 'get', '/listings?guests=-1').expect(400);
    await call(null, 'get', '/listings/' + listing._id).expect(200);
    await call(null, 'get', '/listings/bad').expect(400);
    await call(null, 'get', '/listings/' + new mongoose.Types.ObjectId()).expect(404);
  });
  test('requires ownership and uploaded photos for listing writes', async () => {
    await call(null, 'post', '/listings', listingData()).expect(401);
    await call(guest, 'post', '/listings', listingData()).expect(403);
    await call(host, 'post', '/listings', { ...listingData(), price: -1 }).expect(400);
    await call(host, 'post', '/listings', { ...listingData(), images: ['https://untrusted.test/photo'] }).expect(400);
    const created = await call(host, 'post', '/listings', listingData()).expect(201);
    await call(other, 'put', '/listings/' + created.body.listing.id, listingData()).expect(403);
    const edited = await call(host, 'put', '/listings/' + created.body.listing.id, { ...listingData(), title: 'Updated', host: other.user._id }).expect(200);
    expect(edited.body.listing.title).toBe('Updated');
    expect(edited.body.listing.host.id).toBe(String(host.user._id));
    await call(other, 'delete', '/listings/' + created.body.listing.id).expect(404);
    await call(host, 'delete', '/listings/' + created.body.listing.id).expect(204);
    await call(null, 'get', '/listings/' + created.body.listing.id).expect(404);
  });
  test('decodes uploads, serves safe WebP, and rejects fake or oversized files', async () => {
    await call(guest, 'post', '/uploads').attach('image', png, 'photo.png').expect(403);
    await call(host, 'post', '/uploads').expect(400);
    await call(host, 'post', '/uploads').attach('image', Buffer.from('not an image'), 'fake.png').expect(400);
    await call(host, 'post', '/uploads').attach('image', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"></svg>'), 'image.svg').expect(400);
    await call(host, 'post', '/uploads').attach('wrong', png, 'photo.png').expect(400);
    await call(host, 'post', '/uploads').attach('image', Buffer.alloc(5 * 1024 * 1024 + 1), 'large.png').expect(413);
    const response = await call(host, 'post', '/uploads').attach('image', png, '../../photo.png').expect(201);
    expect(response.body.url).toMatch(/^\/api\/uploads\/[\w-]+\.webp$/);
    await request(app).get(response.body.url).expect('Content-Type', /webp/).expect(200);
    await call(host, 'post', '/listings', { ...listingData(), images: [response.body.url] }).expect(201);
    await call(other, 'post', '/listings', { ...listingData(), images: [response.body.url] }).expect(400);
  });
});

describe('bookings, availability and carts', () => {
  test('computes money server-side and deduplicates requests', async () => {
    const key = crypto.randomUUID();
    const booking = await book(guest, { totalPrice: 0.01 }, key);
    expect(booking.totalPrice).toBe(250.5);
    const retry = await book(guest, {}, key);
    expect(retry.id).toBe(booking.id);
    const [a, b] = await Promise.all([book(guest, {}, 'parallel-key'), book(guest, {}, 'parallel-key')]);
    expect(a.id).toBe(b.id);
    expect((await call(guest, 'get', '/bookings').expect(200)).body.bookings).toHaveLength(2);
    expect((await call(host, 'get', '/bookings').expect(200)).body.bookings).toHaveLength(2);
    expect((await call(other, 'get', '/bookings').expect(200)).body.bookings).toHaveLength(0);
  });
  test('validates date ranges, guest limits, ownership and request keys', async () => {
    await call(guest, 'post', '/bookings', stay()).expect(400);
    for (const data of [{ checkIn: 'invalid' }, { checkIn: date(-1) }, { checkOut: date(9) }, { checkOut: date(400) }, { guests: 5 }, { guests: 1.5 }]) await call(guest, 'post', '/bookings', { ...stay(), ...data }).set('Idempotency-Key', 'valid-key').expect(400);
    await call(host, 'post', '/bookings', stay()).set('Idempotency-Key', 'valid-key').expect(400);
    await call(null, 'get', '/bookings').expect(401);
  });
  test('accepts only one overlapping request, while adjacent dates remain available', async () => {
    const first = await book(); const second = await book(other);
    await call(guest, 'patch', '/bookings/' + first.id, { status: 'accepted' }).expect(403);
    const results = await Promise.all([first, second].map(b => call(host, 'patch', '/bookings/' + b.id, { status: 'accepted' })));
    expect(results.map(r => r.status).sort()).toEqual([200, 409]);
    await call(guest, 'post', '/bookings', stay()).set('Idempotency-Key', 'blocked-key').expect(409);
    await book(guest, { checkIn: date(12), checkOut: date(14) });
    const accepted = results.find(r => r.status === 200).body.booking;
    await call(host, 'patch', '/bookings/' + accepted.id, { status: 'denied' }).expect(409);
  });
  test('enforces cancellation/denial permissions and rejects stale or archived requests', async () => {
    const first = await book();
    await call(other, 'patch', '/bookings/' + first.id, { status: 'cancelled' }).expect(403);
    await call(guest, 'patch', '/bookings/' + first.id, { status: 'cancelled' }).expect(200);
    const second = await book();
    await call(host, 'patch', '/bookings/' + second.id, { status: 'denied' }).expect(200);
    await call(host, 'patch', '/bookings/' + second.id, { status: 'paid' }).expect(400);
    await call(host, 'patch', '/bookings/' + new mongoose.Types.ObjectId(), { status: 'accepted' }).expect(404);
    const third = await book();
    await Listing.updateOne({ _id: listing._id }, { $set: { archived: true } });
    await call(host, 'patch', '/bookings/' + third.id, { status: 'accepted' }).expect(409);
    await Listing.updateOne({ _id: listing._id, 'bookings._id': third.id }, { $set: { archived: false, 'bookings.$.checkIn': new Date(0) } });
    await call(host, 'patch', '/bookings/' + third.id, { status: 'accepted' }).expect(409);
  });
  test('persists carts, isolates users, removes items and submits requests', async () => {
    const item = await call(guest, 'post', '/cart', stay()).expect(201);
    const duplicate = await call(guest, 'post', '/cart', stay()).expect(201);
    expect(item.body.id).toBe(duplicate.body.id);
    expect((await call(guest, 'get', '/cart').expect(200)).body.items[0].totalPrice).toBe(250.5);
    expect((await call(other, 'get', '/cart').expect(200)).body.items).toHaveLength(0);
    await call(other, 'delete', '/cart/' + item.body.id).expect(404);
    await call(guest, 'delete', '/cart/' + item.body.id).expect(204);
    await call(guest, 'post', '/cart/submit').expect(400);
    await call(host, 'post', '/cart', stay()).expect(400);
    await call(guest, 'post', '/cart', stay()).expect(201);
    const submitted = await call(guest, 'post', '/cart/submit').expect(200);
    expect(submitted.body.results[0].booking.status).toBe('pending');
    expect(await Cart.countDocuments()).toBe(0);
  });
  test('leaves unavailable cart items intact and deduplicates concurrent submissions', async () => {
    await call(guest, 'post', '/cart', stay()).expect(201);
    const results = await Promise.all([call(guest, 'post', '/cart/submit'), call(guest, 'post', '/cart/submit')]);
    expect(results.every(r => [200, 400].includes(r.status))).toBe(true);
    const saved = await Listing.findById(listing._id);
    expect(saved.bookings).toHaveLength(1);
    await accept({ id: String(saved.bookings[0]._id) });
    await call(other, 'post', '/cart', stay()).expect(201);
    const failed = await call(other, 'post', '/cart/submit').expect(200);
    expect(failed.body.results[0].error).toMatch(/unavailable/);
    expect(await Cart.countDocuments({ user: other.user._id })).toBe(1);
  });
});

describe('simulated payments', () => {
  test('simulates only an accepted booking owned by the signed-in traveler', async () => {
    const booking = await book();
    await call(null, 'post', '/payments/simulate/' + booking.id).expect(401);
    await call(guest, 'post', '/payments/simulate/' + booking.id).expect(409);
    await accept(booking);
    await call(other, 'post', '/payments/simulate/' + booking.id).expect(403);
    await call(host, 'post', '/payments/simulate/' + booking.id).expect(403);
    const response = await call(guest, 'post', '/payments/simulate/' + booking.id).expect(200);
    expect(response.body).toMatchObject({ simulated: true, booking: { id: booking.id, status: 'paid', paymentMode: 'simulated', totalPrice: 250.5 } });
    expect(response.body.message).toContain('No money was charged');
    expect(response.body).not.toHaveProperty('url');
    const saved = (await Listing.findById(listing._id)).bookings[0];
    expect(saved.paymentMode).toBe('simulated');
    expect(saved.paidAt).toBeInstanceOf(Date);
    const history = await call(guest, 'get', '/bookings').expect(200);
    expect(history.body.bookings[0].paymentMode).toBe('simulated');
  });
  test('deduplicates retries and concurrent requests without changing the payment timestamp', async () => {
    const booking = await book(); await accept(booking);
    const results = await Promise.all([1, 2].map(() => call(guest, 'post', '/payments/simulate/' + booking.id).expect(200)));
    expect(results[0].body.booking.paidAt).toBe(results[1].body.booking.paidAt);
    const retry = await call(guest, 'post', '/payments/simulate/' + booking.id).expect(200);
    expect(retry.body.booking.paidAt).toBe(results[0].body.booking.paidAt);
    expect((await Listing.findById(listing._id)).bookings).toHaveLength(1);
  });
  test('rejects payment details and client-supplied amounts; removes external payment endpoints', async () => {
    const booking = await book(); await accept(booking);
    for (const body of [{ totalCents: 1 }, { paymentDetails: 'must not be stored' }]) {
      await call(guest, 'post', '/payments/simulate/' + booking.id, body).expect(400);
    }
    expect((await Listing.findById(listing._id)).bookings[0].status).toBe('accepted');
    await call(guest, 'post', '/payments/checkout/' + booking.id).expect(404);
    await call(null, 'post', '/payments/webhook', {}).expect(404);
    await call(guest, 'post', '/payments/simulate/bad').expect(400);
    await call(guest, 'post', '/payments/simulate/' + new mongoose.Types.ObjectId()).expect(404);
    await request(app).post('/api/payments/simulate/' + booking.id).set('Cookie', 'session=' + guest.token).expect(403);
  });
  test('rejects cancelled, denied and legacy paid bookings', async () => {
    const booking = await book();
    for (const status of ['cancelled', 'denied', 'paid']) {
      await Listing.updateOne({ _id: listing._id, 'bookings._id': booking.id }, { $set: { 'bookings.$.status': status } });
      await call(guest, 'post', '/payments/simulate/' + booking.id).expect(409);
    }
  });
});

describe('reviews, private messages, support and routing', () => {
  test('allows exactly one review after a paid completed stay', async () => {
    await call(guest, 'post', '/listings/' + listing._id + '/reviews', { rating: 5 }).expect(403);
    const booking = await book(); await accept(booking); await call(guest, 'post', '/payments/simulate/' + booking.id).expect(200);
    await call(guest, 'post', '/listings/' + listing._id + '/reviews', { rating: 5 }).expect(403);
    await Listing.updateOne({ _id: listing._id, 'bookings._id': booking.id }, { $set: { 'bookings.$.checkOut': new Date(Date.now() - 86400000) } });
    await call(guest, 'post', '/listings/' + listing._id + '/reviews', { rating: 6 }).expect(400);
    const review = await call(guest, 'post', '/listings/' + listing._id + '/reviews', { rating: 5, comment: 'Great stay' }).expect(201);
    expect(review.body.listing.rating).toBe(5);
    expect(review.body.listing.reviews[0].userName).toBe('guest');
    await call(guest, 'post', '/listings/' + listing._id + '/reviews', { rating: 4 }).expect(409);
    await call(host, 'post', '/listings/' + listing._id + '/reviews', { rating: 5 }).expect(403);
  });
  test('persists conversations shared only by guest and host', async () => {
    const result = await call(guest, 'post', '/threads', { propertyId: String(listing._id) }).expect(201);
    const threadId = result.body.id;
    expect((await call(guest, 'post', '/threads', { propertyId: String(listing._id) }).expect(201)).body.id).toBe(threadId);
    await call(host, 'post', '/threads', { propertyId: String(listing._id) }).expect(400);
    await call(other, 'post', '/threads/' + threadId + '/messages', { text: 'intrusion' }).expect(404);
    await call(guest, 'post', '/threads/' + threadId + '/messages', { text: 'Hello' }).expect(201);
    await call(host, 'post', '/threads/' + threadId + '/messages', { text: 'Welcome' }).expect(201);
    await call(host, 'post', '/threads/' + threadId + '/messages', { text: ' ' }).expect(400);
    const inbox = await call(guest, 'get', '/threads').expect(200);
    expect(inbox.body.threads[0].messages.map(m => m.text)).toEqual(['Hello', 'Welcome']);
    expect((await call(host, 'get', '/threads').expect(200)).body.threads).toHaveLength(1);
    expect((await call(other, 'get', '/threads').expect(200)).body.threads).toHaveLength(0);
    const thread = await Thread.findById(threadId);
    thread.messages = Array.from({ length: 1000 }, () => ({ sender: guest.user._id, text: 'history' })); await thread.save();
    await call(guest, 'post', '/threads/' + threadId + '/messages', { text: 'overflow' }).expect(404);
  });
  test('stores support tickets for the authenticated user and handles malformed requests', async () => {
    await call(null, 'post', '/support', { subject: 'Help', message: 'Question' }).expect(401);
    const ticket = await call(guest, 'post', '/support', { subject: 'Help', message: 'Question', email: 'fake@example.com' }).expect(201);
    expect((await Support.findById(ticket.body.id)).email).toBe('guest@example.com');
    await call(guest, 'post', '/support', {}).expect(400);
    await call(null, 'get', '/health').expect(200);
    await call(null, 'get', '/missing').expect(404);
    await request(app).post('/api/auth/login').set('Content-Type', 'application/json').set('X-Requested-With', 'NotAirbnb').send('{bad').expect(400);
    await request(app).options('/api/auth/login').set('Origin', origin).expect(204);
  });
  test('rate limits authentication attempts and rejects empty request bodies', async () => {
    await call(guest, 'post', '/cart').expect(400);
    const limited = createApp();
    for (let i = 0; i < 30; i++) await call(null, 'post', '/auth/login', {}, limited).expect(400);
    const result = await call(null, 'post', '/auth/login', {}, limited).expect(429);
    expect(result.body.error).toMatch(/Too many attempts/);
  });
});
