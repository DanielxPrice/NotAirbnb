import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Workspace, { EmptyState } from '../components/Workspace';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
export default function BookingsPage() {
  const { user, isPreview } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const navigate = useNavigate();
  const load = useCallback(async () => {
    try { setBookings((await api('/bookings')).bookings); setError(''); } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); const timer = setInterval(load, 10000); return () => clearInterval(timer); }, [load]);
  async function action(booking, type) {
    setBusy(true); setError(''); setNotice('');
    try {
      if (type === 'pay') {
        const result = await api('/payments/simulate/' + booking.id, { method: 'POST' });
        setBookings(current => current.map(b => b.id === result.booking.id ? result.booking : b));
        setNotice(result.message);
      } else if (type === 'message') {
        const { id } = await api('/threads', { method: 'POST', body: { propertyId: booking.propertyId } });
        navigate('/chat?thread=' + id);
      } else { await api('/bookings/' + booking.id, { method: 'PATCH', body: { status: type } }); await load(); }
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  const visible = bookings.filter(b => filter === 'all' || b.status === filter);
  const date = value => new Date(value.slice(0, 10) + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const statusClass = { pending: 'bg-amber-50 text-amber-800', accepted: 'bg-blue-50 text-blue-800', paid: 'bg-emerald-50 text-emerald-800', denied: 'bg-gray-100 text-gray-600', cancelled: 'bg-gray-100 text-gray-600' };
  return <Workspace title="My Bookings" eyebrow="Your stays, in one place" description={user.role === 'host' ? 'Welcome your next guests. Review requests and keep track of every stay.' : 'From the first request to your next getaway, keep every detail close.'}>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">{[['Total bookings', bookings.length], ['Awaiting approval', bookings.filter(b => b.status === 'pending').length], ['Confirmed stays', bookings.filter(b => ['accepted','paid'].includes(b.status)).length]].map(([label,value]) => <div key={label} className="workspace-panel"><p className="text-sm text-gray-500">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p></div>)}</div>
    <p className="mb-6 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">Demo payments only. No card details are collected and no money is charged.</p>
    {notice && <p role="status" className="workspace-notice mb-4">{notice}</p>}
    {error && <p role="alert" className="text-red-700 mb-4">{error}</p>}
    <div className="flex flex-wrap items-center justify-between gap-3 mb-5"><label className="text-sm font-medium">Show <select className="ml-2 px-3 py-2" value={filter} onChange={e => setFilter(e.target.value)}>
      {['all', 'pending', 'accepted', 'paid', 'denied', 'cancelled'].map(s => <option key={s} value={s}>{s === 'paid' ? 'paid (simulated)' : s}</option>)}
    </select></label><button className="btn btn-secondary" onClick={load}>Refresh</button></div>
    {loading ? <p role="status">Loading bookings...</p> : visible.length === 0 ? <EmptyState title={bookings.length ? 'No bookings in this view' : 'Your next chapter starts here'}><p>{bookings.length ? 'Try a different status to see your other stays.' : 'No bookings yet. Find a place you would love to stay.'}</p><Link to="/search" className="inline-block mt-4 text-rose-600 font-semibold">Explore stays &rarr;</Link></EmptyState> : visible.map(b => <article className="workspace-panel mb-4" key={b.id}>
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-wider text-gray-500 mb-2">{b.hostId === user.id ? 'Hosting' : 'Your getaway'}</p><Link className="text-xl font-semibold hover:text-rose-600" to={'/listing/' + b.propertyId}>{b.propertyTitle}</Link></div><span className={'text-xs font-semibold px-3 py-2 rounded-full capitalize ' + statusClass[b.status]}>{b.status === 'paid' && b.paymentMode === 'simulated' ? 'Paid (simulated)' : b.status}</span></div>
      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-y border-gray-100 py-5 my-5"><div><dt className="text-xs text-gray-500 mb-1">Stay dates</dt><dd className="text-sm font-medium">{date(b.checkIn)} &ndash; {date(b.checkOut)}</dd></div><div><dt className="text-xs text-gray-500 mb-1">Guests</dt><dd className="font-medium">{b.guests}</dd></div><div><dt className="text-xs text-gray-500 mb-1">Stay total</dt><dd className="font-semibold">{'$' + b.totalPrice.toFixed(2)}</dd></div></dl>
      <div className="flex flex-wrap gap-3">
        {b.hostId === user.id && b.status === 'pending' && <><button disabled={busy || isPreview} className="btn btn-primary" onClick={() => action(b, 'accepted')}>Accept</button><button disabled={busy || isPreview} className="btn btn-secondary" onClick={() => action(b, 'denied')}>Deny</button></>}
        {b.userId === user.id && b.status === 'pending' && <button disabled={busy || isPreview} className="btn btn-secondary" onClick={() => action(b, 'cancelled')}>Cancel Request</button>}
        {b.userId === user.id && b.status === 'accepted' && <button disabled={busy || isPreview} className="btn btn-primary" onClick={() => action(b, 'pay')}>Simulate Payment</button>}
        {b.userId === user.id && <button disabled={busy || isPreview} className="btn btn-secondary" onClick={() => action(b, 'message')}>Message Host</button>}
      </div>
    </article>)}
  </Workspace>;
}
