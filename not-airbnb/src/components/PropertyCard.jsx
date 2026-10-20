import React from 'react';
import { Link } from 'react-router-dom';
import { StarIcon } from '@heroicons/react/24/solid';

export default function PropertyCard({ listing }) {
  return <Link to={`/listing/${listing.id}`} className="property-card group">
    <div className="relative overflow-hidden rounded-2xl bg-rose-50">
      <img src={listing.images[0]} alt={listing.title} loading="lazy" className="h-60 w-full object-cover transition-transform duration-300 group-hover:scale-105" />
      <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-gray-700">{listing.bedrooms === 0 ? 'Studio' : `${listing.bedrooms} bedrooms`} &middot; {listing.maxGuests} guests</span>
    </div>
    <div className="pt-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-gray-900 group-hover:text-rose-600">{listing.title}</h3>
        <span className="flex shrink-0 items-center gap-1 text-sm"><StarIcon className="h-4 w-4 text-rose-500" />{listing.rating > 0 ? listing.rating : 'New'}</span>
      </div>
      <p className="mt-1 text-sm text-gray-500">{listing.location}</p>
      <p className="mt-3 text-gray-900"><strong>${listing.price.toLocaleString()}</strong><span className="text-sm text-gray-500"> / night</span></p>
    </div>
  </Link>;
}
