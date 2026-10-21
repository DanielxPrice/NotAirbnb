const crypto = require('crypto');
const { AbuseCounter } = require('./models');
const policies = {
  login: [20, 15 * 60], messages: [30, 60], uploads: [20, 3600],
  support: [5, 3600], bookings: [30, 3600], listings: [40, 3600],
  threads: [20, 3600], reviews: [10, 3600], account: [20, 3600]
};
// Mongo-backed fixed windows survive restarts and are shared by API instances.
function abuseLimit(action) {
  return async (req, res, next) => {
    if (req.app.locals.disableRateLimit) return next();
    const identity = action === 'login' ? req.body.email : req.user.id;
    if (typeof identity !== 'string' || !identity.trim() || identity.length > 254) return next();
    const [limit, seconds] = policies[action];
    const window = Math.floor(Date.now() / (seconds * 1000));
    const expiresAt = new Date((window + 1) * seconds * 1000);
    const digest = crypto.createHash('sha256').update(identity.trim().toLowerCase()).digest('hex');
    const key = `${action}:${digest}:${window}`;
    const update = () => AbuseCounter.findOneAndUpdate({ _id: key }, { $inc: { count: 1 }, $setOnInsert: { expiresAt } }, { upsert: true, new: true });
    let counter;
    try { counter = await update(); } catch (error) {
      if (error.code !== 11000) throw error;
      counter = await update();
    }
    if (counter.count > limit) {
      res.set('Retry-After', String(Math.max(1, Math.ceil((expiresAt - Date.now()) / 1000))));
      return res.status(429).json({ error: 'Too many attempts. Please wait before trying again.' });
    }
    next();
  };
}
module.exports = { abuseLimit, policies };
