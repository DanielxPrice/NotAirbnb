import React, { useState } from 'react';
import { api } from '../api';
export default function SupportPage() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setBusy(true);
    try { const data = await api('/support', { method: 'POST', body: { subject, message } }); setNotice(data.message + ' Reference: ' + data.id); setSubject(''); setMessage(''); }
    catch (e) { setNotice(e.message); } finally { setBusy(false); }
  }
  return <main className="max-w-xl mx-auto p-6"><h1 className="text-3xl font-bold mb-6">Contact Support</h1>
    <form onSubmit={submit} className="bg-white rounded-lg shadow-md p-6 space-y-4">
      <label className="block">Subject<input required maxLength={200} value={subject} onChange={e => setSubject(e.target.value)} className="block w-full border rounded p-2" /></label>
      <label className="block">Message<textarea required maxLength={5000} value={message} onChange={e => setMessage(e.target.value)} className="block w-full border rounded p-2" rows={6} /></label>
      {notice && <p role="status">{notice}</p>}<button disabled={busy} className="btn btn-primary">Send Request</button>
    </form>
  </main>;
}
