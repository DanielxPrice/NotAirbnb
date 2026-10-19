import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
export default function AccountPage() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user.name);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setBusy(true);
    try { await updateProfile(name); setNotice('Account updated.'); } catch (e) { setNotice(e.message); } finally { setBusy(false); }
  }
  return <main className="max-w-xl mx-auto p-6"><h1 className="text-3xl font-bold mb-6">My Account</h1>
    <form className="bg-white p-6 rounded-lg shadow-md space-y-4" onSubmit={submit}>
      <p>{user.email} ? {user.role}</p><label className="block">Display name<input required maxLength={80} className="block border rounded p-2 w-full" value={name} onChange={e => setName(e.target.value)} /></label>
      {notice && <p role="status">{notice}</p>}<button disabled={busy} className="btn btn-primary">Save</button>
    </form>
  </main>;
}
