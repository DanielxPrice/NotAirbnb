const { abuseLimit } = require('./abuse');
const { Router } = require('express');
const multer = require('multer');
const sharp = require('sharp');
const { imageStorage } = require('./imageStorage');
const { Upload } = require('./models');
const { authenticate, hostOnly } = require('./auth');
const { fail } = require('./validation');

function uploadRoutes(config) {
  const saveImage = imageStorage(config);
  const router = Router();
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });
  router.post('/', authenticate, hostOnly, abuseLimit('uploads'), upload.single('image'), async (req, res) => {
    if (!req.file) fail(400, 'Choose an image');
    let buffer;
    try {
      const image = sharp(req.file.buffer, { limitInputPixels: 25000000 });
      const metadata = await image.metadata();
      if (!['jpeg', 'png', 'webp'].includes(metadata.format)) fail(400, 'Use a JPEG, PNG, or WebP image');
      // Decode/re-encode content, strip metadata and never trust file names/MIME headers.
      buffer = await image.rotate().resize(1600, 1600, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
    } catch { fail(400, 'Use a valid JPEG, PNG, or WebP image (at most 25 megapixels)'); }
    const url = await saveImage(buffer);
    await Upload.create({ user: req.user._id, url });
    res.status(201).json({ url });
  });
  return router;
}
module.exports = { uploadRoutes };
