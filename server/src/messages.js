const { Router } = require('express');
const { Thread, Support } = require('./models');
const { authenticate } = require('./auth');
const { getListing } = require('./listings');
const { schemas, id, fail } = require('./validation');
function messageRoutes() {
  const router = Router();
  router.use(authenticate);
  router.get('/', async (req, res) => {
    const threads = await Thread.find({ $or: [{ host: req.user._id }, { guest: req.user._id }] }).populate('listing', 'title').populate('host guest', 'name').sort({ updatedAt: -1 });
    res.json({ threads: threads.map(t => ({ id: String(t._id), propertyTitle: t.listing.title,
      hostName: t.host.name, guestName: t.guest.name, hostId: String(t.host._id), guestId: String(t.guest._id),
      messages: t.messages.map(m => ({ id: String(m._id), senderId: String(m.sender), text: m.text, timestamp: m.createdAt })) })) });
  });
  router.post('/', async (req, res) => {
    const listing = await getListing(req.body.propertyId);
    if (listing.host._id.equals(req.user._id)) fail(400, 'You cannot message yourself');
    const thread = await Thread.findOneAndUpdate({ listing: listing._id, guest: req.user._id }, { $setOnInsert: { host: listing.host._id } }, { upsert: true, new: true });
    res.status(201).json({ id: String(thread._id) });
  });
  router.post('/:id/messages', async (req, res) => {
    const data = schemas.message.parse(req.body);
    const thread = await Thread.findOneAndUpdate({ _id: id(req.params.id), $or: [{ host: req.user._id }, { guest: req.user._id }], 'messages.999': { $exists: false } }, { $push: { messages: { sender: req.user._id, text: data.text } } }, { new: true });
    if (!thread) fail(404, 'Conversation unavailable or full');
    res.status(201).json({ sent: true });
  });
  return router;
}
function supportRoutes() {
  const router = Router();
  router.post('/', authenticate, async (req, res) => {
    const data = schemas.support.parse(req.body);
    const ticket = await Support.create({ ...data, user: req.user._id, email: req.user.email });
    res.status(201).json({ id: String(ticket._id), message: 'Your support request has been saved.' });
  });
  return router;
}
module.exports = { messageRoutes, supportRoutes };
