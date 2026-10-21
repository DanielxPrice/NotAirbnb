require('dotenv').config();
const mongoose = require('mongoose');
const { Listing, User } = require('./models');
const { populateDemoReviews } = require('./demoReviews');
async function main() {
  const email = process.argv.find(value => value.startsWith('--host='))?.slice(7);
  if (!email || !process.env.MONGODB_URI) throw new Error('Set MONGODB_URI and pass --host=email');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000, connectTimeoutMS: 15000 });
  const host = await User.findOne({ email: email.toLowerCase(), role: 'host' });
  if (!host) throw new Error('Host not found');
  const filter = { host: host._id, archived: false };
  if (process.argv.includes('--remove-demo')) {
    const result = await Listing.updateMany(filter, { $pull: { reviews: { isDemo: true, seedKey: /^demo-review-v1-/ } } });
    console.log(JSON.stringify({ updated: result.modifiedCount }));
  } else if (process.argv.includes('--apply')) {
    console.log(JSON.stringify(await populateDemoReviews(Listing, filter)));
  } else {
    console.log(JSON.stringify({ matchingListings: await Listing.countDocuments(filter), mode: 'dry-run' }));
  }
}
main().catch(() => { console.error('Review seeding failed. Check database connectivity and the host argument.'); process.exitCode = 1; }).finally(() => mongoose.disconnect());
