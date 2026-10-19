const { Router } = require('express');
const mongoose = require('mongoose');
const { Listing, Cart } = require('./models');
const { authenticate } = require('./auth');
const { getListing } = require('./listings');
const { stayDetails, fail, id, schemas } = require('./validation');

function publicBooking(booking, listing) {
  return { id: String(booking._id), propertyId: String(listing._id), propertyTitle: listing.title,
    hostId: String(listing.host), userId: String(booking.user), checkIn: booking.checkIn, checkOut: booking.checkOut,
    guests: booking.guests, totalPrice: booking.totalCents / 100, status: booking.status,
    paymentMode: booking.paymentMode, paidAt: booking.paidAt };
}
const overlap = stay => ({ status: { $in: ['accepted', 'paid'] }, checkIn: { $lt: stay.checkOut }, checkOut: { $gt: stay.checkIn } });
async function createBooking(listingId, user, body, requestKey) {
  const listing = await getListing(listingId);
  if (listing.host._id.equals(user._id)) fail(400, 'You cannot book your own property');
  const prior = listing.bookings.find(b => b.user.equals(user._id) && b.requestKey === requestKey);
  if (prior) return publicBooking(prior, { ...listing.toObject(), host: listing.host._id });
  const stay = stayDetails(body, listing);
  const bookingId = new mongoose.Types.ObjectId();
  const updated = await Listing.findOneAndUpdate({
    _id: listing._id, archived: false,
    // Retry if price or capacity changed while computing the quote.
    price: listing.price, maxGuests: listing.maxGuests,
    $and: [{ bookings: { $not: { $elemMatch: overlap(stay) } } }, { bookings: { $not: { $elemMatch: { user: user._id, requestKey } } } }]
  }, { $push: { bookings: { _id: bookingId, ...stay, user: user._id, requestKey } } }, { new: true });
  if (!updated) {
    const retry = await Listing.findById(listing._id);
    const existing = retry.bookings.find(b => b.user.equals(user._id) && b.requestKey === requestKey);
    if (existing) return publicBooking(existing, retry);
    fail(409, 'Dates are unavailable or the property changed. Refresh and try again');
  }
  return publicBooking(updated.bookings.id(bookingId), updated);
}
async function findBooking(bookingId) {
  const listing = await Listing.findOne({ 'bookings._id': id(bookingId) });
  if (!listing) fail(404, 'Booking not found');
  return { listing, booking: listing.bookings.id(bookingId) };
}
function bookingRoutes() {
  const router = Router();
  router.use(authenticate);
  router.get('/', async (req, res) => {
    const listings = await Listing.find({ $or: [{ host: req.user._id }, { 'bookings.user': req.user._id }] });
    res.json({ bookings: listings.flatMap(l => l.bookings.filter(b => l.host.equals(req.user._id) || b.user.equals(req.user._id)).map(b => publicBooking(b, l))) });
  });
  router.post('/', async (req, res) => {
    const key = req.get('Idempotency-Key');
    if (!key || !/^[\w-]{8,100}$/.test(key)) fail(400, 'An Idempotency-Key header is required');
    const booking = await createBooking(req.body.propertyId, req.user, req.body, key);
    res.status(201).json({ booking });
  });
  router.patch('/:id', async (req, res) => {
    const { status } = schemas.status.parse(req.body);
    const { listing, booking } = await findBooking(req.params.id);
    const authorized = status === 'cancelled' ? booking.user.equals(req.user._id) : listing.host.equals(req.user._id);
    if (!authorized) fail(403, 'You cannot change this booking');
    if (booking.status !== 'pending') fail(409, 'Only pending requests can be changed');
    if (status === 'accepted' && (listing.archived || booking.checkIn < new Date(new Date().toISOString().slice(0, 10)))) fail(409, 'This request can no longer be accepted');
    const filter = { _id: listing._id, bookings: { $elemMatch: { _id: booking._id, status: 'pending' } } };
    if (status === 'accepted') {
      filter.archived = false;
      filter.$and = [{ bookings: { $not: { $elemMatch: overlap(booking) } } }];
    }
    const updated = await Listing.findOneAndUpdate(filter, { $set: { 'bookings.$.status': status } }, { new: true });
    if (!updated) fail(409, 'Booking changed or dates are already reserved');
    res.json({ booking: publicBooking(updated.bookings.id(booking._id), updated) });
  });
  return router;
}
function cartRoutes() {
  const router = Router();
  router.use(authenticate);
  router.get('/', async (req, res) => {
    const cart = await Cart.find({ user: req.user._id }).populate('listing', 'title images price archived');
    res.json({ items: cart.map(item => ({ id: String(item._id), propertyId: String(item.listing._id), title: item.listing.title,
      image: item.listing.images[0], archived: item.listing.archived, checkIn: item.checkIn, checkOut: item.checkOut, guests: item.guests,
      totalPrice: Math.round(item.listing.price * 100) * ((item.checkOut - item.checkIn) / 86400000) / 100 })) });
  });
  router.post('/', async (req, res) => {
    const listing = await getListing(req.body.propertyId);
    if (listing.host._id.equals(req.user._id)) fail(400, 'You cannot book your own property');
    const stay = stayDetails(req.body, listing);
    const item = await Cart.findOneAndUpdate({ user: req.user._id, listing: listing._id, checkIn: stay.checkIn, checkOut: stay.checkOut }, { $set: { guests: stay.guests } }, { upsert: true, new: true });
    res.status(201).json({ id: String(item._id) });
  });
  router.delete('/:id', async (req, res) => {
    const deleted = await Cart.deleteOne({ _id: id(req.params.id), user: req.user._id });
    if (!deleted.deletedCount) fail(404, 'Cart item not found');
    res.sendStatus(204);
  });
  router.post('/submit', async (req, res) => {
    const items = await Cart.find({ user: req.user._id });
    if (!items.length) fail(400, 'Your cart is empty');
    const results = [];
    // Each item commits independently; failed items remain in the cart for correction.
    for (const item of items) {
      try {
        const booking = await createBooking(String(item.listing), req.user, { checkIn: item.checkIn.toISOString().slice(0, 10), checkOut: item.checkOut.toISOString().slice(0, 10), guests: item.guests }, String(item._id));
        await Cart.deleteOne({ _id: item._id, user: req.user._id });
        results.push({ itemId: String(item._id), booking });
      } catch (error) {
        if (!error.status) throw error;
        results.push({ itemId: String(item._id), error: error.message });
      }
    }
    res.json({ results });
  });
  return router;
}
module.exports = { bookingRoutes, cartRoutes, findBooking, publicBooking };
