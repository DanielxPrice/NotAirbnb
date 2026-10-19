const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { Router } = require('express');
const { User, Session } = require('./models');
const { schemas, fail } = require('./validation');
const hash = token => crypto.createHash('sha256').update(token).digest('hex');
const publicUser = user => ({ id: String(user._id), email: user.email, name: user.name, role: user.role });
const cookieOptions = config => ({ httpOnly: true, secure: config.secureCookies, sameSite: 'lax', path: '/api' });
async function authenticate(req, res, next) {
  const token = req.cookies.session;
  if (!token) fail(401, 'Please sign in');
  const session = await Session.findOne({ tokenHash: hash(token), expiresAt: { $gt: new Date() } }).populate('user');
  if (!session?.user) fail(401, 'Your session has expired. Please sign in');
  req.user = session.user;
  next();
}
function hostOnly(req, res, next) {
  if (req.user.role !== 'host') fail(403, 'A host account is required');
  next();
}
function authRoutes(config) {
  const router = Router();
  async function signIn(req, res, user, status) {
    if (req.cookies.session) await Session.deleteOne({ tokenHash: hash(req.cookies.session) });
    const token = crypto.randomBytes(32).toString('hex');
    await Session.create({ tokenHash: hash(token), user: user._id, expiresAt: new Date(Date.now() + 7 * 86400000) });
    res.cookie('session', token, { ...cookieOptions(config), maxAge: 7 * 86400000 });
    res.status(status).json({ user: publicUser(user) });
  }
  router.post('/register', async (req, res) => {
    const data = schemas.register.parse(req.body);
    const user = await User.create({ email: data.email, name: data.name || data.email.split('@')[0], role: data.role, passwordHash: await bcrypt.hash(data.password, 12) });
    await signIn(req, res, user, 201);
  });
  router.post('/login', async (req, res) => {
    const data = schemas.login.parse(req.body);
    const user = await User.findOne({ email: data.email }).select('+passwordHash');
    // A valid dummy hash keeps nonexistent-account timing close to a bad password.
    const valid = await bcrypt.compare(data.password, user?.passwordHash || '$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW');
    if (!user || !valid) fail(401, 'Invalid email or password');
    await signIn(req, res, user, 200);
  });
  router.post('/logout', async (req, res) => {
    if (req.cookies.session) await Session.deleteOne({ tokenHash: hash(req.cookies.session) });
    res.clearCookie('session', cookieOptions(config)).sendStatus(204);
  });
  router.get('/me', authenticate, (req, res) => res.json({ user: publicUser(req.user) }));
  router.patch('/me', authenticate, async (req, res) => {
    req.user.name = schemas.profile.parse(req.body).name;
    await req.user.save();
    res.json({ user: publicUser(req.user) });
  });
  return router;
}
module.exports = { authRoutes, authenticate, hostOnly, publicUser };
