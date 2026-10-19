require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User, Listing } = require('./models');
const { schemas } = require('./validation');
async function seed() {
  if (!process.env.MONGODB_URI) throw new Error('Set MONGODB_URI');
  const data = schemas.register.parse({ email: process.env.SEED_HOST_EMAIL, password: process.env.SEED_HOST_PASSWORD, role: 'host', name: 'Demo Host' });
  await mongoose.connect(process.env.MONGODB_URI);
  let host = await User.findOne({ email: data.email });
  if (host && host.role !== 'host') throw new Error('Seed email belongs to a traveler');
  if (!host) host = await User.create({ email: data.email, name: data.name, role: data.role, passwordHash: await bcrypt.hash(data.password, 12) });
  if (await Listing.exists({ host: host._id })) { console.log('Host already has listings; nothing added.'); return; }
  await Listing.insertMany([
    { host: host._id, title: 'Luxury Beachfront Villa', location: 'Miami Beach, FL', price: 299, description: 'Beautiful beachfront villa with stunning ocean views.', bedrooms: 4, bathrooms: 3, maxGuests: 8, images: ['https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3'] },
    { host: host._id, title: 'Modern Downtown Apartment', location: 'New York, NY', price: 199, description: 'Stylish apartment in the heart of downtown Manhattan.', bedrooms: 2, bathrooms: 2, maxGuests: 4, images: ['https://images.unsplash.com/photo-1542718610-a1d656d1884c?ixlib=rb-4.0.3'] }
  ]);
  console.log('Added two sample properties. No bookings, reviews, or payments fabricated.');
}
seed().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
