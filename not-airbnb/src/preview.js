// Preview identity is UI-only. It never represents an authenticated backend user.
export function previewMode() {
  const match = window.location.pathname.match(/^\/preview(?:\/(host|traveler))?(?=\/|$)/);
  return match ? { role: match[1] || 'traveler', basename: match[0] } : null;
}
export const previewListings = [
  ['Coastal Weekend Villa', 'San Diego, CA', 240, 'photo-1512917774080-9991f1c4c750'],
  ['City Garden Apartment', 'Portland, OR', 135, 'photo-1522708323590-d24dbb6b0267'],
  ['Quiet Mountain Retreat', 'Big Bear, CA', 185, 'photo-1449158743715-0a90ebb6d2d8']
].map(([title, location, price, photo], index) => ({
  id: `preview-property-${index}`, title, location, price, bedrooms: 2, bathrooms: 2, maxGuests: 4,
  description: 'A fictional stay for exploring the app preview. This property cannot be booked.',
  images: [`https://images.unsplash.com/${photo}?auto=format&fit=crop&w=900&q=80`], amenities: ['WiFi', 'Kitchen', 'Free parking'],
  host: { id: 'preview-host', name: 'Sample Host' }, archived: false, rating: 5,
  reviews: [{ id: `preview-review-${index}`, userName: 'Sample Traveler', rating: 5, comment: 'Fictional review showing how guest feedback appears.', isDemo: true, date: '2026-09-01T12:00:00Z' }]
}));
export function previewResponse(path, method) {
  if (method.toUpperCase() !== 'GET') throw Object.assign(new Error('Preview only. Account actions are disabled.'), { status: 403 });
  const role = previewMode().role;
  const user = { id: `preview-${role}`, name: role === 'host' ? 'Sample Host' : 'Sample Traveler', email: `${role}@preview.example`, role };
  const bookings = previewListings.map((listing, index) => ({ id: `preview-booking-${index}`, propertyId: listing.id, propertyTitle: listing.title, hostId: 'preview-host', userId: 'preview-traveler', checkIn: '2030-06-10', checkOut: '2030-06-12', guests: 2, totalPrice: listing.price * 2, status: ['pending', 'accepted', 'paid'][index], paymentMode: index === 2 ? 'simulated' : undefined }));
  const responses = {
    '/auth/me': { user }, '/listings': { listings: previewListings }, '/bookings': { bookings },
    '/cart': { items: [{ id: 'preview-cart', propertyId: previewListings[0].id, title: previewListings[0].title, image: previewListings[0].images[0], checkIn: '2030-06-10', checkOut: '2030-06-12', guests: 2, totalPrice: 480 }] },
    '/threads': { threads: [{ id: 'preview-thread', propertyTitle: previewListings[0].title, hostId: 'preview-host', guestId: 'preview-traveler', hostName: 'Sample Host', guestName: 'Sample Traveler', blocked: false, blockedByMe: false, messages: [{ id: 'preview-message-1', senderId: 'preview-traveler', text: 'What time is check-in? This is a sample conversation.', timestamp: '2026-09-01T12:00:00Z' }, { id: 'preview-message-2', senderId: 'preview-host', text: 'Welcome! Check-in starts at 3 PM. No messages can be sent in preview.', timestamp: '2026-09-01T12:05:00Z' }] }] }
  };
  if (!(path in responses)) throw Object.assign(new Error('This action is unavailable in preview.'), { status: 403 });
  return JSON.parse(JSON.stringify(responses[path]));
}
