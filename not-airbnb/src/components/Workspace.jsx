import React from 'react';
import { NavLink } from 'react-router-dom';
export default function Workspace({ title, eyebrow, description, children }) {
  return <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
    <header className="mb-8"><p className="text-xs font-bold uppercase tracking-widest text-rose-600 mb-3">{eyebrow}</p><h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{title}</h1><p className="mt-3 text-gray-500 max-w-2xl leading-relaxed">{description}</p></header>
    <nav aria-label="Your workspace" className="flex flex-wrap gap-2 mb-8 border-b border-gray-200 pb-4">
      {[['/bookings','Bookings'],['/account','Account'],['/support','Support'],['/chat','Messages']].map(([to,label]) => <NavLink key={to} to={to} aria-label={`Workspace: ${label}`} className={({isActive}) => 'rounded-full px-4 py-2 text-sm font-semibold transition-colors ' + (isActive ? 'bg-rose-100 text-rose-800' : 'text-gray-500 hover:bg-white hover:text-gray-900')}>{label}</NavLink>)}
    </nav>{children}
  </main>;
}
export function EmptyState({ title, children }) {
  return <div className="rounded-2xl border border-dashed border-rose-200 bg-white px-6 py-12 text-center"><div aria-hidden="true" className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-500 text-xl">&#9671;</div><h2 className="font-semibold text-lg">{title}</h2><div className="text-gray-500 mt-2 text-sm leading-relaxed">{children}</div></div>;
}
