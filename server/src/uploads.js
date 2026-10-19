const { Router } = require('express');
const multer = require('multer');
const sharp = require('sharp');
const { randomUUID } = require('crypto');
const path = require('path');
const fs = require('fs/promises');
const { Upload } = require('./models');
const { authenticate, hostOnly } = require('./auth');
const { fail } = require('./validation');

function uploadRoutes(config) {
  const router = Router();
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });
  router.post('/', authenticate, hostOnly, upload.single('image'), async (req, res) => {
    if (!req.file) fail(400, 'Choose an image');
    let buffer;
    try {
      const image = sharp(req.file.buffer, { limitInputPixels: 25000000 });
      const metadata = await image.metadata();
      if (!['jpeg', 'png', 'webp'].includes(metadata.format)) fail(400, 'Use a JPEG, PNG, or WebP image');
      // Decode/re-encode content, strip metadata and never trust file names/MIME headers.
      buffer = await image.rotate().resize(1600, 1600, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
    } catch { fail(400, 'Use a valid JPEG, PNG, or WebP image (at most 25 megapixels)'); }
    await fs.mkdir(config.uploadDir, { recursive: true });
    const name = `${randomUUID()}.webp`;
    await fs.writeFile(path.join(config.uploadDir, name), buffer);
    const url = `/api/uploads/${name}`;
    await Upload.create({ user: req.user._id, url });
    res.status(201).json({ url });
  });
  return router;
}
module.exports = { uploadRoutes };
