const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { rateLimit } = require('express-rate-limit');
const mongoose = require('mongoose');
const path = require('path');
const { ZodError } = require('zod');
const { authRoutes } = require('./auth');
const { listingRoutes } = require('./listings');
const { bookingRoutes, cartRoutes } = require('./bookings');
const { paymentRoutes } = require('./payments');
const { uploadRoutes } = require('./uploads');
const { messageRoutes, supportRoutes } = require('./messages');
const { fail } = require('./validation');

function createApp(options = {}) {
  const config = {
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    secureCookies: process.env.COOKIE_SECURE === 'true',
    uploadDir: path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '../uploads')),
    ...options
  };
  const app = express();
  app.disable('x-powered-by');
  // Set the number of trusted reverse proxies explicitly for your deployment.
  app.set('trust proxy', Number(process.env.TRUST_PROXY || 0));
  app.use(helmet());
  app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.use(cors({ origin: config.frontendUrl, credentials: true }));
  app.use(express.json({ limit: '100kb' }), cookieParser());
  app.use((req, res, next) => { req.body ??= {}; next(); });
  app.use('/api', (req, res, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      if (req.get('X-Requested-With') !== 'NotAirbnb' || (req.get('Origin') && req.get('Origin') !== config.frontendUrl)) fail(403, 'Request origin could not be verified');
    }
    next();
  });
  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false, skip: () => Boolean(config.disableRateLimit), message: { error: 'Too many attempts. Try again later' } });
  app.use(['/api/auth/login', '/api/auth/register'], limiter);
  app.use('/api', rateLimit({ windowMs: 60 * 1000, limit: 200, standardHeaders: 'draft-8', legacyHeaders: false, skip: () => Boolean(config.disableRateLimit), message: { error: 'Too many requests. Try again shortly' } }));
  app.get('/api/health', (req, res) => res.status(mongoose.connection.readyState === 1 ? 200 : 503).json({ ready: mongoose.connection.readyState === 1 }));
  app.use('/api/auth', authRoutes(config));
  app.use('/api/listings', listingRoutes());
  app.use('/api/bookings', bookingRoutes());
  app.use('/api/cart', cartRoutes());
  app.use('/api/payments', paymentRoutes());
  app.use('/api/uploads', uploadRoutes(config));
  app.use('/api/uploads', express.static(config.uploadDir, { dotfiles: 'deny', index: false, fallthrough: true, setHeaders: res => res.set('Cross-Origin-Resource-Policy', 'cross-origin') }));
  app.use('/api/threads', messageRoutes());
  app.use('/api/support', supportRoutes());
  app.use((req, res) => res.status(404).json({ error: 'Endpoint not found' }));
  app.use((error, req, res, next) => {
    if (error instanceof ZodError) return res.status(400).json({ error: error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ') });
    if (error.code === 11000) return res.status(409).json({ error: 'This record already exists' });
    if (error.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'Images must be under 5 MB' });
    if (error.name === 'MulterError') return res.status(400).json({ error: 'Upload one image using the image field' });
    const status = error.status || 500;
    if (status >= 500) console.error('API error:', error.message);
    res.status(status).json({ error: status >= 500 ? (status === 503 ? 'Service is not configured or temporarily unavailable' : 'Something went wrong. Please try again') : error.message });
  });
  return app;
}
module.exports = { createApp };
