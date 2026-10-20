import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import PropertyCard from '../components/PropertyCard';

const HomePage = () => {
  const { user } = useAuth();
  const { listings, loading } = useData();
  const featured = listings.slice(0, 3);
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <section className="home-hero relative overflow-hidden rounded-3xl p-7 sm:p-12 lg:p-16">
        <div className="relative z-10 max-w-2xl">
          <p className="mb-5 text-xs font-bold uppercase tracking-widest text-rose-700">A little escape. A place to belong.</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 leading-tight">Welcome to NotAirbnb</h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-gray-600">Somewhere new. Something memorable. Find your perfect stay or share a place of your own.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/search" className="btn btn-primary px-7 py-3">Find a Place <span aria-hidden="true">&rarr;</span></Link>
            {!user && <Link to="/register" className="btn bg-white text-gray-800 border border-rose-100 px-7 py-3 hover:bg-rose-50">Become a Host</Link>}
            {user?.role === 'host' && <Link to="/listings" className="btn bg-white text-gray-800 px-7 py-3">Manage your spaces</Link>}
          </div>
        </div>
        <div className="hero-decoration" aria-hidden="true"><span /><span /><span /></div>
      </section>
      <section className="py-12 sm:py-16" aria-labelledby="explore-heading">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-widest text-rose-600 mb-2">Make yourself at home</p><h2 id="explore-heading" className="text-2xl sm:text-3xl font-bold tracking-tight">Your next stay starts here</h2><p className="text-gray-500 mt-2">Discover spaces for a weekend away or a change of scenery.</p></div>
          <Link to="/search" className="text-sm font-semibold text-rose-600 hover:text-rose-800">Explore all stays &rarr;</Link>
        </div>
        {loading ? <p role="status" className="py-8 text-gray-500">Finding your next getaway...</p> : featured.length ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">{featured.map(listing => <PropertyCard key={listing.id} listing={listing} />)}</div> : <div className="rounded-2xl border border-dashed border-rose-200 p-8 text-gray-600">New places are on the way. Check back soon to find your next stay.</div>}
      </section>
      <section className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 flex flex-wrap items-center justify-between gap-5">
        <div><h2 className="text-xl font-semibold">A space for every kind of getaway.</h2><p className="mt-2 text-gray-500">Find your destination, choose your dates, and make it your own.</p></div>
        <Link to="/search" className="btn btn-secondary">Browse destinations &rarr;</Link>
      </section>
    </main>
  );
};
export default HomePage;
