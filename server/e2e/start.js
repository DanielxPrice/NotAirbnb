const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const os = require('os');
const fs = require('fs/promises');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { createApp } = require('../src/app');
(async () => {
  const mongo = await MongoMemoryServer.create({ binary: { downloadDir: path.join(__dirname, '../.mongodb-binaries') } });
  await mongoose.connect(mongo.getUri());
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));
  const uploads = await fs.mkdtemp(path.join(os.tmpdir(), 'notairbnb-e2e-'));
  const api = createApp({ frontendUrl: 'http://localhost:4173', uploadDir: uploads, disableRateLimit: true });
  const app = express();
  app.use((req, res, next) => req.path.startsWith('/api/') ? api(req, res, next) : next());
  const build = path.resolve(__dirname, '../../not-airbnb/build');
  app.use(express.static(build));
  app.get('/{*splat}', (req, res) => res.sendFile(path.join(build, 'index.html')));
  const server = app.listen(4173, '127.0.0.1');
  async function stop() {
    server.close();
    await mongoose.disconnect();
    await mongo.stop();
    await fs.rm(uploads, { recursive: true, force: true });
    process.exit(0);
  }
  // Explicit teardown also works on Windows without process-tree kill privileges.
  app.post('/__shutdown', (req, res) => { res.sendStatus(204); setImmediate(stop); });
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
})().catch(error => { console.error(error); process.exit(1); });
