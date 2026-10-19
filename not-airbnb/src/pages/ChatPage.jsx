import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
export default function ChatPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [threads, setThreads] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const end = useRef();
  const selected = threads.find(t => t.id === params.get('thread'));
  const load = useCallback(async () => {
    try { setThreads((await api('/threads')).threads); setError(''); } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); const timer = setInterval(load, 5000); return () => clearInterval(timer); }, [load]);
  useEffect(() => { end.current?.scrollIntoView?.({ behavior: 'smooth' }); }, [selected?.id, selected?.messages.length]);
  async function send(e) {
    e.preventDefault(); setBusy(true);
    try { await api('/threads/' + selected.id + '/messages', { method: 'POST', body: { text: message } }); setMessage(''); await load(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <main className="max-w-7xl mx-auto px-4 py-8">
    <h1 className="text-3xl font-bold mb-6">Messages</h1>
    {error && <p role="alert" className="text-red-700 mb-4">{error}</p>}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <aside className="bg-white rounded-lg shadow-md p-4">
        {loading ? <p>Loading conversations?</p> : threads.length === 0 ? <p>No conversations yet. Message a host from a property page.</p> : threads.map(t => <button className={'block w-full text-left rounded p-4 mb-2 ' + (selected?.id === t.id ? 'bg-rose-50' : 'hover:bg-gray-50')} key={t.id} onClick={() => setParams({ thread: t.id })}>
          <strong>{t.propertyTitle}</strong><p>{t.hostId === user.id ? t.guestName : t.hostName}</p>
        </button>)}
      </aside>
      <section className="md:col-span-2 bg-white rounded-lg shadow-md p-6">
        {!selected ? <p>Select a conversation</p> : <>
          <h2 className="text-xl font-semibold mb-4">{selected.propertyTitle}</h2>
          <div className="h-96 overflow-y-auto space-y-3">
            {selected.messages.map(m => <div key={m.id} className={'p-3 rounded-lg max-w-md ' + (m.senderId === user.id ? 'bg-rose-50 ml-auto' : 'bg-gray-100')}>
              <p className="whitespace-pre-wrap break-words">{m.text}</p><time className="text-xs text-gray-500">{new Date(m.timestamp).toLocaleString()}</time>
            </div>)}<div ref={end} />
          </div>
          <form onSubmit={send} className="flex gap-3 mt-4">
            <input aria-label="Message" required maxLength={2000} value={message} onChange={e => setMessage(e.target.value)} className="flex-1 border rounded-lg p-3 min-w-0" placeholder="Type a message?" />
            <button disabled={busy || !message.trim()} className="btn btn-primary" aria-label="Send message"><PaperAirplaneIcon className="h-5 w-5" /></button>
          </form>
        </>}
      </section>
    </div>
  </main>;
}
