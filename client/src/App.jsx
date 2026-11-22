import React from 'react';
import Catalog from './pages/Catalog.jsx';
import Upload from './pages/Upload.jsx';

const NAV = [
  { href: '/', label: 'Catalogue' },
  { href: '/upload', label: 'Importer un fichier' }
];

export default function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const Page = path === '/upload' ? Upload : Catalog;
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Stock The North Face</h1>
          <p className="text-sm text-gray-600">Articles disponibles dans le dernier fichier ATP.</p>
        </div>
        <nav className="flex gap-2" aria-label="Navigation">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              aria-current={n.href === path ? 'page' : undefined}
              className={`px-4 py-2 rounded-lg text-sm ${n.href === path ? 'bg-gray-800 text-white' : 'bg-white border hover:bg-gray-50'}`}
            >
              {n.label}
            </a>
          ))}
        </nav>
      </header>
      <Page />
    </div>
  );
}
