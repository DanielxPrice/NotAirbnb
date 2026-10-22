import React, { useState } from 'react';
import Workspace from '../components/Workspace';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
export default function AccountPage() {
  const { user, updateProfile, isPreview } = useAuth();
  const [name, setName] = useState(user.name);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setBusy(true);
    try { await updateProfile(name); setNotice('Account updated.'); } catch (e) { setNotice(e.message); } finally { setBusy(false); }
  }
  async function revoke() {
    setBusy(true); setNotice('');
    try { setNotice((await api('/auth/sessions/revoke-others', { method: 'POST' })).message); }
    catch (e) { setNotice(e.message); } finally { setBusy(false); }
  }
  return <Workspace title="My Account" eyebrow="A little more you" description="Manage your profile and keep your account in your hands.">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <aside className="workspace-panel text-center self-start"><div className="mx-auto h-20 w-20 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-3xl font-bold" aria-hidden="true">{user.name.slice(0,1).toUpperCase()}</div><h2 className="font-semibold text-xl mt-4 break-words">{user.name}</h2><p className="mt-2 text-sm text-gray-500 break-all">{user.email}</p><span className="inline-block mt-4 rounded-full bg-rose-50 px-4 py-1 text-sm font-medium capitalize text-rose-700">{user.role}</span></aside>
      <div className="md:col-span-2 space-y-6"><form className="workspace-panel space-y-5" onSubmit={submit}><div><h2 className="text-xl font-semibold">Personal details</h2><p className="text-sm text-gray-500 mt-2">Your display name appears in conversations and reviews.</p></div>
        <label className="block text-sm font-medium">Display name<input required maxLength={80} className="mt-2 block w-full" value={name} onChange={e => setName(e.target.value)} /></label>
        <button disabled={busy || isPreview} className="btn btn-primary">Save</button>
      </form><section className="workspace-panel"><h2 className="text-xl font-semibold">Account security</h2><p className="mt-2 mb-5 text-sm text-gray-500 leading-relaxed">Used a shared device? Sign out your other sessions while keeping this browser signed in.</p><button disabled={busy || isPreview} onClick={revoke} className="btn btn-secondary">Sign out other sessions</button></section>
      {notice && <p role="status" className="workspace-notice">{notice}</p>}</div>
    </div>
  </Workspace>;
}
