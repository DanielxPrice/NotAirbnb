import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
export default function BookingsPage() {
  const { user } = useAuth();
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
  return <main className="max-w-5xl mx-auto px-4 py-8">
    <h1 className="text-3xl font-bold mb-6">My Bookings</h1>
    <p className="mb-4 text-gray-600">Demo payments only. No card details are collected and no money is charged.</p>
    {notice && <p role="status" className="mb-4">{notice}</p>}
    {error && <p role="alert" className="text-red-700 mb-4">{error}</p>}
    <label>Show <select className="p-2 mb-4 rounded" value={filter} onChange={e => setFilter(e.target.value)}>
      {['all', 'pending', 'accepted', 'paid', 'denied', 'cancelled'].map(s => <option key={s} value={s}>{s === 'paid' ? 'paid (simulated)' : s}</option>)}
    </select></label>
    <button className="ml-4 text-rose-600" onClick={load}>Refresh</button>
    {loading ? <p>Loading bookings?</p> : bookings.length === 0 ? <p>No bookings yet.</p> : bookings.filter(b => filter === 'all' || b.status === filter).map(b => <article className="bg-white rounded-lg shadow-md p-6 mb-4" key={b.id}>
      <Link className="text-xl font-semibold" to={'/listing/' + b.propertyId}>{b.propertyTitle}</Link>
      <p>{b.checkIn.slice(0, 10)} ? {b.checkOut.slice(0, 10)} ? {b.guests} guests ? {'$' + b.totalPrice.toFixed(2)}</p>
      <p className="capitalize my-2">{b.status === 'paid' && b.paymentMode === 'simulated' ? 'Paid (simulated)' : b.status}{b.hostId === user.id ? ' ? Hosting' : ''}</p>
      <div className="flex flex-wrap gap-3">
        {b.hostId === user.id && b.status === 'pending' && <><button disabled={busy} className="btn btn-primary" onClick={() => action(b, 'accepted')}>Accept</button><button disabled={busy} className="btn btn-secondary" onClick={() => action(b, 'denied')}>Deny</button></>}
        {b.userId === user.id && b.status === 'pending' && <button disabled={busy} className="btn btn-secondary" onClick={() => action(b, 'cancelled')}>Cancel Request</button>}
        {b.userId === user.id && b.status === 'accepted' && <button disabled={busy} className="btn btn-primary" onClick={() => action(b, 'pay')}>Simulate Payment</button>}
        {b.userId === user.id && <button disabled={busy} className="btn btn-secondary" onClick={() => action(b, 'message')}>Message Host</button>}
      </div>
    </article>)}
  </main>;
}
