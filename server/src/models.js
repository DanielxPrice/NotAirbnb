const mongoose = require('mongoose');
const { Schema } = mongoose;
const ref = { type: Schema.Types.ObjectId, ref: 'User', required: true };
const userSchema = new Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['host', 'traveler'], required: true }
}, { timestamps: true });
const sessionSchema = new Schema({
  tokenHash: { type: String, unique: true, required: true },
  user: ref,
  expiresAt: { type: Date, required: true, expires: 0 }
});
const bookingSchema = new Schema({
  user: ref, checkIn: Date, checkOut: Date, guests: Number,
  totalCents: Number, requestKey: String,
  status: { type: String, enum: ['pending', 'accepted', 'denied', 'cancelled', 'paid'], default: 'pending' },
  paymentMode: { type: String, enum: ['simulated'] }, paidAt: Date
}, { timestamps: true });
const reviewSchema = new Schema({ user: { ...ref, required: function () { return !this.isDemo; } }, userName: String, rating: Number, comment: String, isDemo: { type: Boolean, default: false }, seedKey: String }, { timestamps: true });
const listingSchema = new Schema({
  host: ref, title: String, location: String, description: String,
  price: Number, bedrooms: Number, bathrooms: Number, maxGuests: Number,
  images: [String], amenities: [String], archived: { type: Boolean, default: false },
  bookings: [bookingSchema], reviews: [reviewSchema]
}, { timestamps: true });
listingSchema.index({ host: 1 });
listingSchema.index({ 'bookings.user': 1 });
const cartSchema = new Schema({
  user: ref, listing: { type: Schema.Types.ObjectId, ref: 'Listing', required: true },
  checkIn: Date, checkOut: Date, guests: Number
}, { timestamps: true });
cartSchema.index({ user: 1, listing: 1, checkIn: 1, checkOut: 1 }, { unique: true });
const threadSchema = new Schema({
  listing: { type: Schema.Types.ObjectId, ref: 'Listing', required: true },
  host: ref, guest: ref,
  blockedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  messages: [{ sender: ref, text: String, createdAt: { type: Date, default: Date.now } }]
}, { timestamps: true });
threadSchema.index({ listing: 1, guest: 1 }, { unique: true });
const uploadSchema = new Schema({ user: ref, url: { type: String, unique: true } }, { timestamps: true });
const supportSchema = new Schema({ user: ref, email: String, subject: String, message: String }, { timestamps: true });
const abuseCounterSchema = new Schema({ _id: String, count: { type: Number, default: 0 }, expiresAt: { type: Date, expires: 0 } });
module.exports = {
  AbuseCounter: mongoose.model('AbuseCounter', abuseCounterSchema),
  User: mongoose.model('User', userSchema), Session: mongoose.model('Session', sessionSchema),
  Listing: mongoose.model('Listing', listingSchema), Cart: mongoose.model('Cart', cartSchema),
  Thread: mongoose.model('Thread', threadSchema), Upload: mongoose.model('Upload', uploadSchema),
  Support: mongoose.model('Support', supportSchema)
};
