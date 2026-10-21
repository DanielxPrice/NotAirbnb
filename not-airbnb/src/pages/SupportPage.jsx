import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Workspace from '../components/Workspace';
import { api } from '../api';
export default function SupportPage() {
  const [params] = useSearchParams();
  const [subject, setSubject] = useState((params.get('subject') || '').slice(0, 200));
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setBusy(true);
    try { const data = await api('/support', { method: 'POST', body: { subject, message } }); setNotice(data.message + ' Reference: ' + data.id); setSubject(''); setMessage(''); }
    catch (e) { setNotice(e.message); } finally { setBusy(false); }
  }
  return <Workspace title="Contact Support" eyebrow="A little help along the way" description="Have a question or something to report? Save the details here so they can be reviewed.">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6"><aside className="space-y-5"><div className="workspace-panel"><h2 className="font-semibold text-lg">What can you report?</h2><ul className="mt-4 space-y-3 text-sm text-gray-600"><li>Booking or account issues</li><li>Misleading property information</li><li>Harassment or unwanted messages</li></ul></div><div className="rounded-2xl bg-rose-50 p-6 text-sm text-rose-900 leading-relaxed">Include the property name or conversation reference. Never include passwords or payment details.<p className="mt-3">Requests are saved in this demo application; live support and response times are not guaranteed.</p></div></aside>
    <form onSubmit={submit} className="workspace-panel md:col-span-2 space-y-5"><h2 className="text-xl font-semibold">Tell us what happened</h2>
      <label className="block text-sm font-medium">Subject<input required maxLength={200} value={subject} onChange={e => setSubject(e.target.value)} className="block w-full mt-2" placeholder="How can we help?" /></label>
      <label className="block text-sm font-medium">Message<textarea required maxLength={5000} value={message} onChange={e => setMessage(e.target.value)} className="block w-full mt-2" rows={7} placeholder="Share the details of your question or concern." /></label><p className="text-xs text-gray-500 text-right">{message.length} / 5,000</p>
      {notice && <p role="status" className="workspace-notice">{notice}</p>}<button disabled={busy} className="btn btn-primary">{busy ? 'Sending...' : 'Send Request'}</button>
    </form></div>
  </Workspace>;
}
