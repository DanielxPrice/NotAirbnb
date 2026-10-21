const samples = [
  ['Demo guest Alex', 5, 'The bright living area and comfortable layout made this sample getaway feel welcoming.'],
  ['Demo guest Sam', 4, 'A pleasant example of a weekend stay, with useful amenities and room to unwind.'],
  ['Demo guest Jordan', 5, 'The space shown in this demo would be a lovely base for exploring the area.'],
  ['Demo guest Casey', 4, 'The sample listing has a practical layout for a short trip with friends.'],
  ['Demo guest Taylor', 5, 'A cozy-looking retreat with inviting shared spaces and a relaxed atmosphere.'],
  ['Demo guest Morgan', 4, 'The illustrated amenities and comfortable rooms suit a laid-back getaway.']
];
function demoReviews(index = 0) {
  return Array.from({ length: 3 }, (_, offset) => {
    const [userName, rating, comment] = samples[(index + offset) % samples.length];
    return { userName, rating, comment: 'Fictional demo review: ' + comment, isDemo: true, seedKey: `demo-review-v1-${offset}` };
  });
}
async function populateDemoReviews(Listing, filter) {
  const listings = await Listing.find(filter).sort({ _id: 1 }).select('_id');
  let added = 0;
  for (const [index, listing] of listings.entries()) {
    for (const review of demoReviews(index)) {
      const result = await Listing.updateOne({ _id: listing._id, 'reviews.seedKey': { $ne: review.seedKey } }, { $push: { reviews: review } });
      added += result.modifiedCount;
    }
  }
  return { listings: listings.length, added };
}
module.exports = { demoReviews, populateDemoReviews };
