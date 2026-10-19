import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../api';
const DataContext = createContext();
export const useData = () => useContext(DataContext);
export const DataProvider = ({ children }) => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    try { const data = await api('/listings'); setListings(data.listings); setError(''); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  return <DataContext.Provider value={{ listings, loading, refresh }}>
    {error && <div role="alert" className="p-4 text-red-700">{error} <button onClick={refresh} className="underline">Retry</button></div>}
    {children}
  </DataContext.Provider>;
};
