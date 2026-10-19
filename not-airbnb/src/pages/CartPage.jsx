import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
export default function CartPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try { setItems((await api('/cart')).items); } catch (e) { setNotice(e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  async function remove(id) {
    setBusy(true);
    try { await api('/cart/' + id, { method: 'DELETE' }); await load(); } catch (e) { setNotice(e.message); }
    finally { setBusy(false); }
  }
  async function submit() {
    setBusy(true); setNotice('');
    try {
      const { results } = await api('/cart/submit', { method: 'POST' });
      const failed = results.filter(r => r.error);
      setNotice((results.length - failed.length) + ' booking request(s) submitted. ' + (failed.length ? failed.map(r => r.error).join('; ') : 'Track them in My Bookings.'));
      await load();
    } catch (e) { setNotice(e.message); } finally { setBusy(false); }
  }
  return <main className="max-w-4xl mx-auto px-4 py-8">
    <h1 className="text-3xl font-bold mb-6">Your Cart</h1>
    {notice && <p role="status" className="mb-4">{notice}</p>}
    {loading ? <p>Loading cart?</p> : items.length === 0 ? <p>Your cart is empty. <Link className="text-rose-600" to="/search">Find a stay</Link></p> : <>
      {items.map(item => <div key={item.id} className="bg-white rounded-lg shadow-md p-6 mb-4 flex justify-between gap-4">
        <div><Link className="text-xl font-semibold" to={'/listing/' + item.propertyId}>{item.title}</Link>
          <p>{item.checkIn.slice(0, 10)} ? {item.checkOut.slice(0, 10)} ? {item.guests} guests</p><p>{'$' + item.totalPrice.toFixed(2)}{item.archived && ' ? No longer available'}</p></div>
        <button className="text-rose-600" disabled={busy} onClick={() => remove(item.id)}>Remove</button>
      </div>)}
      <p className="mb-4">Total: {'$' + items.reduce((sum, i) => sum + i.totalPrice, 0).toFixed(2)}. Final pricing is confirmed when you submit.</p>
      <button className="btn btn-primary" disabled={busy} onClick={submit}>{busy ? 'Submitting?' : 'Submit Booking Requests'}</button>
    </>}
    <Link className="block mt-6 text-rose-600" to="/bookings">My Bookings</Link>
  </main>;
}
