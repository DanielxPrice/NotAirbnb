import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { MapPinIcon, StarIcon } from '@heroicons/react/24/solid';

const Search = () => {
  const { listings, loading } = useData();
  const [params] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(params.get('q') || '');
  useEffect(() => { setSearchQuery(params.get('q') || ''); }, [params]);
  const [bedrooms, setBedrooms] = useState(0);
  const [rating, setRating] = useState(0);
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [guests, setGuests] = useState(1);

  const filteredListings = listings.filter(listing => {
    const matchesSearch = listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         listing.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPrice = listing.price >= priceRange[0] && listing.price <= priceRange[1];
    const matchesGuests = listing.maxGuests >= guests;
    return matchesSearch && matchesPrice && matchesGuests && listing.bedrooms >= bedrooms && listing.rating >= rating;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold mb-4">Filters</h2>
            
            <div className="space-y-4">
              <label className="block">Minimum bedrooms<input aria-label="Minimum bedrooms" type="number" min="0" value={bedrooms} onChange={e => setBedrooms(Number(e.target.value))} className="block w-full border rounded p-2" /></label>
              <label className="block">Minimum rating<select aria-label="Minimum rating" value={rating} onChange={e => setRating(Number(e.target.value))} className="block w-full border rounded p-2">{[0, 1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n === 0 ? 'Any' : n}</option>)}</select></label>
              <div>
                <label className="block text-sm font-medium text-gray-700">Search</label>
                <input
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500"
                  placeholder="Search by title or location"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Price Range</label>
                <div className="mt-1 flex items-center space-x-4">
                  <input
                    type="number"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500"
                    placeholder="Min"
                    value={priceRange[0]}
                    onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                  />
                  <span>to</span>
                  <input
                    type="number"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500"
                    placeholder="Max"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Guests</label>
                <input
                  type="number"
                  min="1"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-rose-500 focus:ring-rose-500"
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {loading && <p>Loading properties?</p>}
            {!loading && filteredListings.length === 0 && <p>No properties match your search.</p>}
            {filteredListings.map((listing) => (
              <Link
                key={listing.id}
                to={`/listing/${listing.id}`}
                className="group"
              >
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="aspect-w-16 aspect-h-9">
                    <img
                      src={listing.images[0]}
                      alt={listing.title}
                      className="w-full h-48 object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900">{listing.title}</h3>
                    <p className="mt-1 text-sm text-gray-500 flex items-center">
                      <MapPinIcon className="h-4 w-4 mr-1" />
                      {listing.location}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center">
                        <StarIcon className="h-4 w-4 text-yellow-400" />
                        <span className="ml-1 text-sm text-gray-600">{listing.rating}</span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900">${listing.price}/night</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Search; 