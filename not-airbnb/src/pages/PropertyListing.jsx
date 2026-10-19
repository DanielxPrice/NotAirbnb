import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { StarIcon, MapPinIcon, HomeIcon, SparklesIcon, UserIcon } from '@heroicons/react/24/solid';

const PropertyListing = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { listings, loading, refresh } = useData();
  const navigate = useNavigate();
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const bookingKey = useRef(crypto.randomUUID());
  const [bookingDates, setBookingDates] = useState({
    checkIn: '',
    checkOut: '',
    guests: 1
  });
  const [review, setReview] = useState({
    rating: 5,
    comment: ''
  });

  useEffect(() => { bookingKey.current = crypto.randomUUID(); }, [id, bookingDates.checkIn, bookingDates.checkOut, bookingDates.guests]);
  const listing = listings.find(l => l.id === id);
  if (loading) return <p className="p-8">Loading property...</p>;

  if (!listing) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900">Property not found</h1>
      </div>
    );
  }

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    setBusy(true); setNotice('');
    try {
      const cart = e.nativeEvent.submitter?.value === 'cart';
      await api(cart ? '/cart' : '/bookings', { method: 'POST', headers: { 'Idempotency-Key': bookingKey.current }, body: { propertyId: id, ...bookingDates } });
      navigate(cart ? '/cart' : '/bookings');
    } catch (error) { setNotice(error.message); } finally { setBusy(false); }
  };
  const handleReview = async (e) => {
    e.preventDefault(); setBusy(true); setNotice('');
    try { await api('/listings/' + id + '/reviews', { method: 'POST', body: review }); await refresh(); setReview({ rating: 5, comment: '' }); setNotice('Review posted.'); }
    catch (error) { setNotice(error.message); } finally { setBusy(false); }
  };
  const messageHost = async () => {
    if (!user) { navigate('/login'); return; }
    setBusy(true);
    try { const data = await api('/threads', { method: 'POST', body: { propertyId: id } }); navigate('/chat?thread=' + data.id); }
    catch (error) { setNotice(error.message); } finally { setBusy(false); }
  };
  const calculateTotalPrice = () => {
    const nights = (new Date(bookingDates.checkOut) - new Date(bookingDates.checkIn)) / 86400000;
    return Number.isFinite(nights) && nights > 0 ? (Math.round(listing.price * 100) * nights / 100).toFixed(2) : '0.00';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {notice && <p role="status" className="mb-4 text-rose-700">{notice}</p>}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <img
            src={listing.images[0]}
            alt={listing.title}
            className="w-full h-96 object-cover rounded-lg"
          />
          <h1 className="text-3xl font-bold text-gray-900 mt-4">{listing.title}</h1>
          <p className="mt-2 text-gray-600 flex items-center">
            <MapPinIcon className="h-5 w-5 mr-1" />
            {listing.location}
          </p>
          <div className="mt-4 flex items-center space-x-4">
            <div className="flex items-center">
              <StarIcon className="h-5 w-5 text-yellow-400" />
              <span className="ml-1 text-gray-600">{listing.rating}</span>
            </div>
            <div className="flex items-center">
              <HomeIcon className="h-5 w-5 text-gray-400" />
              <span className="ml-1 text-gray-600">{listing.bedrooms} beds</span>
            </div>
            <div className="flex items-center">
              <SparklesIcon className="h-5 w-5 text-gray-400" />
              <span className="ml-1 text-gray-600">{listing.bathrooms} baths</span>
            </div>
            <div className="flex items-center">
              <UserIcon className="h-5 w-5 text-gray-400" />
              <span className="ml-1 text-gray-600">Up to {listing.maxGuests} guests</span>
            </div>
          </div>
          <p className="mt-4 text-gray-600">{listing.description}</p>
          <div className="flex gap-3 overflow-x-auto mt-4">{listing.images.slice(1).map(image => <img key={image} src={image} alt={listing.title} className="h-32 rounded-lg" />)}</div>
          {user?.id !== listing.host.id && <button className="btn btn-secondary mt-4" disabled={busy} onClick={messageHost}>Message Host</button>}

          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Reviews</h2>
            {listing.reviews?.map(review => (
              <div key={review.id} className="border-b border-gray-200 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <StarIcon className="h-5 w-5 text-yellow-400" />
                    <span className="ml-1 text-gray-600">{review.rating}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(review.date).toLocaleDateString()}
                  </span>
                </div>
                <p className="mt-2 text-gray-600">{review.comment}</p>
                <p className="mt-1 text-sm text-gray-500">- {review.userName}</p>
              </div>
            ))}
            {user && (
              <form onSubmit={handleReview} className="mt-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Rating</label>
                    <select
                      value={review.rating}
                      onChange={(e) => setReview({ ...review, rating: parseInt(e.target.value) })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500"
                    >
                      {[1, 2, 3, 4, 5].map(num => (
                        <option key={num} value={num}>{num} stars</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Comment</label>
                    <textarea
                      maxLength={2000}
                      value={review.comment}
                      onChange={(e) => setReview({ ...review, comment: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500"
                      rows="3"
                    />
                  </div>
                  <button
                    type="submit" disabled={busy}
                    className="bg-rose-500 text-white px-4 py-2 rounded-md hover:bg-rose-600"
                  >
                    Submit Review
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-lg shadow-md sticky top-8">
            <h2 className="text-2xl font-bold text-gray-900">${listing.price}/night</h2>
            <form onSubmit={handleBooking} className="mt-4 space-y-4">
              <div>
                <label htmlFor="checkIn" className="block text-sm font-medium text-gray-700">Check-in</label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  id="checkIn" value={bookingDates.checkIn}
                  onChange={(e) => setBookingDates({ ...bookingDates, checkIn: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500"
                />
              </div>
              <div>
                <label htmlFor="checkOut" className="block text-sm font-medium text-gray-700">Check-out</label>
                <input
                  type="date"
                  required
                  min={bookingDates.checkIn || new Date().toISOString().split('T')[0]}
                  id="checkOut" value={bookingDates.checkOut}
                  onChange={(e) => setBookingDates({ ...bookingDates, checkOut: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500"
                />
              </div>
              <div>
                <label htmlFor="guests" className="block text-sm font-medium text-gray-700">Guests</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={listing.maxGuests}
                  id="guests" value={bookingDates.guests}
                  onChange={(e) => setBookingDates({ ...bookingDates, guests: parseInt(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500"
                />
              </div>
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between text-gray-600">
                  <span>Total</span>
                  <span>${calculateTotalPrice()}</span>
                </div>
              </div>
              <button
                type="submit" disabled={busy}
                className="w-full bg-rose-500 text-white px-4 py-2 rounded-md hover:bg-rose-600"
              >
                Book Now
              </button>
              <button type="submit" value="cart" disabled={busy} className="w-full btn btn-secondary">Add to Cart</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyListing;
