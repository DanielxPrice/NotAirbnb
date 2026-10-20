const { v2: cloudinary } = require('cloudinary');
const { randomUUID } = require('crypto');
const path = require('path');
const fs = require('fs/promises');
const { fail } = require('./validation');

function imageStorage(config) {
  if (!['local', 'cloudinary'].includes(config.uploadStorage)) throw new Error('UPLOAD_STORAGE must be local or cloudinary');
  if (config.uploadStorage === 'cloudinary' && (!config.cloudinaryCloudName || !config.cloudinaryApiKey || !config.cloudinaryApiSecret)) {
    throw new Error('Cloudinary storage requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET');
  }
  return async buffer => {
    if (config.uploadStorage === 'local') {
      await fs.mkdir(config.uploadDir, { recursive: true });
      const name = `${randomUUID()}.webp`;
      await fs.writeFile(path.join(config.uploadDir, name), buffer);
      return `/api/uploads/${name}`;
    }
    try {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({
          cloud_name: config.cloudinaryCloudName,
          api_key: config.cloudinaryApiKey,
          api_secret: config.cloudinaryApiSecret,
          resource_type: 'image', folder: 'notairbnb',
          public_id: randomUUID(), overwrite: false, timeout: 30000
        }, (error, uploaded) => error ? reject(error) : resolve(uploaded));
        stream.on('error', reject);
        stream.end(buffer);
      });
      if (!result?.secure_url?.startsWith('https://res.cloudinary.com/')) throw new Error('Missing secure image URL');
      return result.secure_url;
    } catch {
      // Do not leak provider credentials/errors or silently store ephemeral files.
      fail(503, 'Image storage is temporarily unavailable');
    }
  };
}
module.exports = { imageStorage };
