const { Router } = require('express');
const { Listing } = require('./models');
const { authenticate } = require('./auth');
const { findBooking, publicBooking } = require('./bookings');
const { fail } = require('./validation');

// Demo only: no payment provider, card fields, or external requests.
function paymentRoutes() {
  const router = Router();
  router.post('/simulate/:id', authenticate, async (req, res) => {
    if (Object.keys(req.body).length) fail(400, 'Payment simulation accepts no payment details');
    const { listing, booking } = await findBooking(req.params.id);
    if (!booking.user.equals(req.user._id)) fail(403, 'This is not your booking');
    if (booking.status !== 'accepted' && !(booking.status === 'paid' && booking.paymentMode === 'simulated')) fail(409, 'Only accepted bookings can simulate payment');
    // The guarded update preserves the original timestamp on retries/double clicks.
    const updated = await Listing.findOneAndUpdate({
      _id: listing._id, bookings: { $elemMatch: { _id: booking._id, status: 'accepted' } }
    }, { $set: { 'bookings.$.status': 'paid', 'bookings.$.paymentMode': 'simulated', 'bookings.$.paidAt': new Date() } }, { new: true });
    const current = updated || (await findBooking(req.params.id)).listing;
    const saved = current.bookings.id(booking._id);
    if (saved.status !== 'paid' || saved.paymentMode !== 'simulated') fail(409, 'Booking changed. Refresh and try again');
    res.json({ booking: publicBooking(saved, current), simulated: true, message: 'Payment simulated successfully. No money was charged.' });
  });
  return router;
}
module.exports = { paymentRoutes };
