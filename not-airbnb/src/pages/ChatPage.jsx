import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../context/AuthContext';
import Workspace, { EmptyState } from '../components/Workspace';
import { api } from '../api';
export default function ChatPage() {
  const { user, isPreview } = useAuth();
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
    e.preventDefault();
    if (!selected || selected.blocked || !message.trim()) return;
    setBusy(true);
    try { await api('/threads/' + selected.id + '/messages', { method: 'POST', body: { text: message } }); setMessage(''); await load(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function toggleBlock() {
    setBusy(true); setError('');
    try { const state = await api('/threads/' + selected.id + '/block', { method: 'PATCH', body: { blocked: !selected.blockedByMe } }); setThreads(current => current.map(t => t.id === selected.id ? { ...t, ...state } : t)); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <Workspace title="Messages" eyebrow="Good stays start with a hello" description="Ask about the details, coordinate your arrival, and keep your conversations together.">
    {error && <p role="alert" className="text-red-700 mb-4">{error}</p>}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      <aside className="workspace-panel min-w-0"><h2 className="font-semibold mb-4">Your conversations <span className="text-gray-400 font-normal">({threads.length})</span></h2>
        {loading ? <p role="status">Loading conversations...</p> : threads.length === 0 ? <p className="text-sm text-gray-500 leading-relaxed">No conversations yet. Message a host from a property page.</p> : <div className="max-h-64 md:max-h-[32rem] overflow-y-auto">{threads.map(t => <button aria-pressed={selected?.id === t.id} className={'block w-full text-left rounded-xl p-4 mb-2 border ' + (selected?.id === t.id ? 'bg-rose-50 border-rose-200' : 'border-transparent hover:bg-gray-50')} key={t.id} onClick={() => { setParams({ thread: t.id }); setMessage(''); }}>
          <strong className="block truncate text-sm">{t.propertyTitle}</strong><span className="block text-sm text-gray-500 mt-1 truncate">{t.hostId === user.id ? t.guestName : t.hostName}</span><span className="block text-xs text-gray-400 mt-2 truncate">{t.blocked ? 'Conversation blocked' : t.messages[t.messages.length - 1]?.text || 'Start a conversation'}</span>
        </button>)}</div>}
      </aside>
      <section className="md:col-span-2 workspace-panel min-w-0">
        {!selected ? <EmptyState title="Select a conversation"><p>Your conversations will appear here.</p><Link to="/search" className="inline-block text-rose-600 font-semibold mt-4">Explore stays &rarr;</Link></EmptyState> : <>
          <div className="border-b border-gray-100 pb-4 mb-4"><h2 className="text-xl font-semibold break-words">{selected.propertyTitle}</h2><p className="text-sm text-gray-500 mt-1">With {selected.hostId === user.id ? selected.guestName : selected.hostName}</p><div className="flex flex-wrap gap-4 mt-3 text-xs"><button disabled={busy || isPreview} className="text-gray-600 underline" onClick={toggleBlock}>{selected.blockedByMe ? 'Unblock conversation' : 'Block conversation'}</button><Link className="text-rose-700 underline" to={'/support?subject=' + encodeURIComponent('Report conversation ' + selected.id)}>Report a concern</Link></div></div>
          <div className="h-80 overflow-y-auto space-y-3 pr-2" aria-label="Conversation messages">
            {selected.messages.length === 0 && <p className="py-8 text-center text-sm text-gray-400">Say hello and start planning your stay.</p>}
            {selected.messages.map(m => <div key={m.id} className={'p-4 rounded-2xl max-w-md w-fit ' + (m.senderId === user.id ? 'bg-rose-50 ml-auto rounded-br-sm' : 'bg-gray-100 rounded-bl-sm')}>
              <p className="whitespace-pre-wrap break-words text-sm">{m.text}</p><time className="block mt-2 text-xs text-gray-500">{new Date(m.timestamp).toLocaleString()}</time>
            </div>)}<div ref={end} />
          </div>
          {selected.blocked && <p className="workspace-notice mt-4">This conversation is blocked. New messages cannot be sent.</p>}
          <form onSubmit={send} className="flex gap-3 mt-5 pt-4 border-t border-gray-100">
            <input aria-label="Message" disabled={selected.blocked || isPreview} required maxLength={2000} value={message} onChange={e => setMessage(e.target.value)} className="flex-1 min-w-0" placeholder="Write a message..." />
            <button disabled={busy || isPreview || selected.blocked || !message.trim()} className="btn btn-primary" aria-label="Send message"><PaperAirplaneIcon className="h-5 w-5" /></button>
          </form>
        </>}
      </section>
    </div>
  </Workspace>;
}
