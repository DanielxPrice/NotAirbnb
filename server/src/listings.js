const { abuseLimit } = require('./abuse');
const { Router } = require('express');
const { Listing, Upload } = require('./models');
const { authenticate, hostOnly } = require('./auth');
const { schemas, fail, id } = require('./validation');

function publicListing(listing) {
  const reviews = listing.reviews.map(review => ({ id: String(review._id), userName: review.userName, rating: review.rating, comment: review.comment, date: review.createdAt, isDemo: Boolean(review.isDemo) }));
  return {
    id: String(listing._id), title: listing.title, location: listing.location, description: listing.description,
    price: listing.price, bedrooms: listing.bedrooms, bathrooms: listing.bathrooms, maxGuests: listing.maxGuests,
    images: listing.images, amenities: listing.amenities, archived: listing.archived,
    host: { id: String(listing.host._id), name: listing.host.name }, reviews,
    rating: reviews.length ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)) : 0
  };
}
async function ownedImages(images, user, existing = []) {
  const added = images.filter(url => !existing.includes(url));
  if (await Upload.countDocuments({ user: user._id, url: { $in: [...new Set(added)] } }) !== new Set(added).size) fail(400, 'Upload your property photos before saving');
}
async function getListing(listingId) {
  const listing = await Listing.findOne({ _id: id(listingId), archived: false }).populate('host', 'name');
  if (!listing) fail(404, 'Property not found');
  return listing;
}
function listingRoutes() {
  const router = Router();
  router.get('/', async (req, res) => {
    // Literal string matching avoids user-controlled regular expressions.
    let listings = (await Listing.find({ archived: false }).select('-bookings').populate('host', 'name').sort({ createdAt: -1 })).map(publicListing);
    const q = String(req.query.q || '').toLowerCase().slice(0, 200);
    listings = listings.filter(l => `${l.title} ${l.location}`.toLowerCase().includes(q));
    for (const [key, field, compare] of [['minPrice', 'price', (a, b) => a >= b], ['maxPrice', 'price', (a, b) => a <= b], ['guests', 'maxGuests', (a, b) => a >= b], ['bedrooms', 'bedrooms', (a, b) => a >= b], ['rating', 'rating', (a, b) => a >= b]]) {
      if (req.query[key] !== undefined) {
        const value = Number(req.query[key]);
        if (!Number.isFinite(value) || value < 0) fail(400, 'Invalid search filter');
        listings = listings.filter(l => compare(l[field], value));
      }
    }
    res.json({ listings });
  });
  router.get('/:id', async (req, res) => res.json({ listing: publicListing(await getListing(req.params.id)) }));
  router.post('/', authenticate, hostOnly, abuseLimit('listings'), async (req, res) => {
    const data = schemas.listing.parse(req.body);
    await ownedImages(data.images, req.user);
    const listing = await Listing.create({ ...data, host: req.user._id });
    await listing.populate('host', 'name');
    res.status(201).json({ listing: publicListing(listing) });
  });
  router.put('/:id', authenticate, hostOnly, abuseLimit('listings'), async (req, res) => {
    const listing = await getListing(req.params.id);
    if (!listing.host._id.equals(req.user._id)) fail(403, 'Only the property owner can edit this listing');
    const data = schemas.listing.parse(req.body);
    await ownedImages(data.images, req.user, listing.images);
    // Update only editable fields, never overwrite concurrent booking/review writes.
    const updated = await Listing.findOneAndUpdate({ _id: listing._id, archived: false }, { $set: data }, { new: true }).populate('host', 'name');
    if (!updated) fail(409, 'Property was archived');
    res.json({ listing: publicListing(updated) });
  });
  router.delete('/:id', authenticate, hostOnly, abuseLimit('listings'), async (req, res) => {
    const listing = await Listing.findOneAndUpdate({ _id: id(req.params.id), host: req.user._id, archived: false }, { $set: { archived: true } });
    if (!listing) fail(404, 'Property not found or not owned by you');
    // Existing accepted reservations remain payable and visible in booking history.
    res.sendStatus(204);
  });
  router.post('/:id/reviews', authenticate, abuseLimit('reviews'), async (req, res) => {
    const data = schemas.review.parse(req.body);
    const listing = await getListing(req.params.id);
    if (!listing.bookings.some(b => b.user.equals(req.user._id) && b.status === 'paid' && b.checkOut <= new Date())) fail(403, 'Reviews require a completed, paid stay');
    const updated = await Listing.findOneAndUpdate({ _id: listing._id, 'reviews.user': { $ne: req.user._id } }, { $push: { reviews: { ...data, user: req.user._id, userName: req.user.name } } }, { new: true }).populate('host', 'name');
    if (!updated) fail(409, 'You already reviewed this property');
    res.status(201).json({ listing: publicListing(updated) });
  });
  return router;
}
module.exports = { listingRoutes, publicListing, getListing };
