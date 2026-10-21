require('dotenv').config();
const mongoose = require('mongoose');
const { createApp } = require('./app');
async function start() {
  if (!process.env.MONGODB_URI) throw new Error('Set MONGODB_URI in server/.env');
  if (process.env.NODE_ENV === 'production' && (!process.env.FRONTEND_URL?.startsWith('https://') || process.env.COOKIE_SECURE !== 'true')) throw new Error('Production requires an HTTPS FRONTEND_URL and COOKIE_SECURE=true');
  await mongoose.connect(process.env.MONGODB_URI);
  // Ensure uniqueness constraints exist before accepting account/cart writes.
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));
  const server = createApp().listen(Number(process.env.PORT || 4000), '0.0.0.0', () => console.log('API listening on port', process.env.PORT || 4000));
  server.requestTimeout = 30000;
  server.headersTimeout = 15000;
  server.keepAliveTimeout = 5000;
  const shutdown = () => server.close(async () => { await mongoose.disconnect(); process.exit(0); });
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
start().catch(error => { console.error(error.message); process.exit(1); });
