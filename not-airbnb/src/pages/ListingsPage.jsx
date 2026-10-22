import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { StarIcon, MapPinIcon, HomeIcon, SparklesIcon } from '@heroicons/react/24/solid';

const ListingsPage = () => {
  const { user, isPreview } = useAuth();
  const { listings, loading, refresh } = useData();
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null);
  const [images, setImages] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newListing, setNewListing] = useState({
    title: '',
    location: '',
    price: '',
    description: '',
    bedrooms: '',
    bathrooms: '',
    maxGuests: '',
    amenities: []
  });

  const userListings = listings.filter(listing => listing.host.id === user.id);

  const handleAddListing = async (e) => {
    e.preventDefault(); setBusy(true); setNotice('');
    try {
      await api(editing ? '/listings/' + editing : '/listings', { method: editing ? 'PUT' : 'POST', body: { ...newListing, images } });
      await refresh(); setShowAddForm(false); setEditing(null); setImages([]);
      setNewListing({ title: '', location: '', price: '', description: '', bedrooms: '', bathrooms: '', maxGuests: '', amenities: [] });
    } catch (error) { setNotice(error.message); } finally { setBusy(false); }
  };
  const uploadImages = async (e) => {
    const files = Array.from(e.target.files); e.target.value = '';
    if (files.length + images.length > 10) { setNotice('Use at most 10 photos.'); return; }
    setBusy(true); setNotice('');
    try {
      for (const file of files) {
        const body = new FormData(); body.append('image', file);
        const data = await api('/uploads', { method: 'POST', body });
        setImages(current => [...current, data.url]);
      }
    } catch (error) { setNotice(error.message); } finally { setBusy(false); }
  };
  const edit = listing => {
    setEditing(listing.id); setNewListing(listing); setImages(listing.images); setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const archive = async listing => {
    if (!window.confirm('Remove this property from search? Existing bookings will remain.')) return;
    setBusy(true);
    try { await api('/listings/' + listing.id, { method: 'DELETE' }); await refresh(); }
    catch (error) { setNotice(error.message); } finally { setBusy(false); }
  };
  if (user.role !== 'host') return <p className="p-8">A host account is required to manage properties.</p>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Listings</h1>
        <button
          onClick={() => { setEditing(null); setImages([]); setNewListing({ title: '', location: '', price: '', description: '', bedrooms: '', bathrooms: '', maxGuests: '', amenities: [] }); setShowAddForm(true); }}
          className="bg-rose-500 text-white px-4 py-2 rounded-md hover:bg-rose-600"
        >
          Add New Listing
        </button>
      </div>

      {notice && <p role="status" className="mb-4 text-rose-700">{notice}</p>}
      {loading && <p>Loading properties...</p>}
      {!loading && userListings.length === 0 && <p className="mb-4">You have no properties yet.</p>}
      {showAddForm && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-semibold mb-4">{editing ? 'Edit Listing' : 'Add New Listing'}</h2>
          <form onSubmit={handleAddListing} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500"
                  id="title" value={newListing.title}
                  onChange={(e) => setNewListing({ ...newListing, title: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700">Location</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500"
                  id="location" value={newListing.location}
                  onChange={(e) => setNewListing({ ...newListing, location: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700">Price per night</label>
                <input
                  type="number"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500"
                  min="0.01" step="0.01" id="price" value={newListing.price}
                  onChange={(e) => setNewListing({ ...newListing, price: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500"
                  id="description" value={newListing.description}
                  onChange={(e) => setNewListing({ ...newListing, description: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="bedrooms" className="block text-sm font-medium text-gray-700">Bedrooms</label>
                <input
                  type="number"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500"
                  id="bedrooms" value={newListing.bedrooms}
                  onChange={(e) => setNewListing({ ...newListing, bedrooms: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="bathrooms" className="block text-sm font-medium text-gray-700">Bathrooms</label>
                <input
                  type="number"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500"
                  id="bathrooms" value={newListing.bathrooms}
                  onChange={(e) => setNewListing({ ...newListing, bathrooms: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="maxGuests" className="block text-sm font-medium text-gray-700">Max Guests</label>
                <input
                  type="number"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500"
                  id="maxGuests" value={newListing.maxGuests}
                  onChange={(e) => setNewListing({ ...newListing, maxGuests: e.target.value })}
                />
              </div>
            </div>
            <label className="block">Property photos (JPEG, PNG, WebP; up to 5 MB each)
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy || isPreview} onChange={uploadImages} className="block mt-2" />
            </label>
            <div className="flex flex-wrap gap-4">{images.map((image, i) => <div key={image}><img src={image} alt={'Property photo ' + (i + 1)} className="h-24 rounded" /><button type="button" disabled={busy || isPreview} className="text-rose-600" onClick={() => setImages(images.filter((_, index) => index !== i))}>Remove photo</button></div>)}</div>
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit" disabled={busy || isPreview || images.length === 0}
                className="bg-rose-500 text-white px-4 py-2 rounded-md hover:bg-rose-600"
              >
                {busy ? 'Saving...' : editing ? 'Save Changes' : 'Add Listing'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {userListings.map((listing) => (
          <div key={listing.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            <img
              src={listing.images[0]}
              alt={listing.title}
              className="w-full h-48 object-cover"
            />
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-900">{listing.title}</h3>
              <p className="mt-1 text-sm text-gray-500 flex items-center">
                <MapPinIcon className="h-4 w-4 mr-1" />
                {listing.location}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="flex items-center">
                  <HomeIcon className="h-5 w-5 text-gray-400" />
                  <span className="ml-2 text-sm text-gray-600">{listing.bedrooms} beds</span>
                </div>
                <div className="flex items-center">
                  <SparklesIcon className="h-5 w-5 text-gray-400" />
                  <span className="ml-2 text-sm text-gray-600">{listing.bathrooms} baths</span>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center">
                  <StarIcon className="h-4 w-4 text-yellow-400" />
                  <span className="ml-1 text-sm text-gray-600">{listing.rating}</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">${listing.price}/night</p>
              </div>
              <div className="flex gap-4 mt-4"><button disabled={busy} className="text-rose-600" onClick={() => edit(listing)}>Edit</button><button disabled={busy || isPreview} className="text-rose-600" onClick={() => archive(listing)}>Archive</button></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ListingsPage; 