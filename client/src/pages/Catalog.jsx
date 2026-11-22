import React, { useCallback, useEffect, useState } from 'react';
import { fetchCatalog } from '../api.js';
import { FACET_KEYS, normalizeQuery, pastedProductUrl } from '../utils.js';
import { useI18n } from '../i18n/index.jsx';
import FilterBar from '../components/FilterBar.jsx';
import ProductCard from '../components/ProductCard.jsx';
import ProductDetail from '../components/ProductDetail.jsx';

function readUrl() {
  const p = new URLSearchParams(window.location.search);
  const state = { q: p.get('q') || '', sort: p.get('sort') || 'season', page: parseInt(p.get('page'), 10) || 1 };
  for (const k of FACET_KEYS) state[k] = p.getAll(k);
  return state;
}

function writeUrl(state) {
  const p = new URLSearchParams();
  if (state.q) p.set('q', state.q);
  if (state.sort !== 'season') p.set('sort', state.sort);
  if (state.page > 1) p.set('page', state.page);
  for (const k of FACET_KEYS) state[k].forEach((v) => p.append(k, v));
  const qs = p.toString();
  window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
}

export default function Catalog() {
  const { t } = useI18n();
  const [state, setState] = useState(readUrl);
  const [text, setText] = useState(state.q);
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(null); // { code, focus }

  // debounce typing into the search box
  useEffect(() => {
    const t = setTimeout(() => {
      const q = normalizeQuery(text).trim();
      setState((s) => (s.q === q ? s : { ...s, q, page: 1 }));
    }, 250);
    return () => clearTimeout(t);
  }, [text]);

  useEffect(() => {
    let live = true;
    writeUrl(state);
    setError(false);
    fetchCatalog(state)
      .then((d) => live && setData(d))
      .catch(() => live && setError(true));
    return () => { live = false; };
  }, [state]);

  const toggle = useCallback((key, value) => {
    setState((s) => ({
      ...s,
      page: 1,
      [key]: s[key].includes(value) ? s[key].filter((v) => v !== value) : [...s[key], value]
    }));
  }, []);

  const replace = useCallback((key, values) => {
    setState((s) => ({ ...s, page: 1, [key]: values }));
  }, []);

  const clear = () => setState((s) => ({ ...s, page: 1, ...Object.fromEntries(FACET_KEYS.map((k) => [k, []])) }));
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('catalog.searchPlaceholder')}
          aria-label={t('catalog.search')}
          className="flex-1 min-w-[16rem] p-3 border rounded-lg shadow-sm"
        />
        <p className="basis-full text-xs text-gray-500 -mt-1">{t('catalog.searchHint')}</p>
        <select
          value={state.sort}
          onChange={(e) => setState((s) => ({ ...s, sort: e.target.value, page: 1 }))}
          aria-label={t('sort.label')}
          className="p-3 border rounded-lg bg-white"
        >
          <option value="season">{t('sort.season')}</option>
          <option value="name">{t('sort.name')}</option>
          <option value="stock">{t('sort.stock')}</option>
          <option value="colors">{t('sort.colors')}</option>
        </select>
      </div>

      <FilterBar
        facets={data?.facets}
        selected={state}
        currentSeasons={data?.currentSeasons}
        onToggle={toggle}
        onReplace={replace}
        onClear={clear}
      />

      <main>
        {error && <p className="text-red-700">{t('catalog.loadError')}</p>}
        {data && (
          <>
            <p className="text-sm text-gray-600 mb-3" aria-live="polite">{t('catalog.count', { count: data.total })}</p>
            {data.total === 0 && <p className="bg-white rounded-lg p-6 text-gray-600">{t('catalog.empty')}</p>}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {data.items.map((item) => <ProductCard key={item.code} item={item} onOpen={(code, focus) => setOpen({ code, focus })} />)}
            </div>
            {pages > 1 && (
              <nav className="flex items-center justify-center gap-4 mt-6" aria-label="Pagination">
                <button disabled={state.page <= 1} onClick={() => setState((s) => ({ ...s, page: s.page - 1 }))} className="px-4 py-2 bg-white rounded border disabled:opacity-40">{t('page.prev')}</button>
                <span className="text-sm">{t('page.of', { page: data.page, pages })}</span>
                <button disabled={state.page >= pages} onClick={() => setState((s) => ({ ...s, page: s.page + 1 }))} className="px-4 py-2 bg-white rounded border disabled:opacity-40">{t('page.next')}</button>
              </nav>
            )}
          </>
        )}
      </main>

      {open && <ProductDetail code={open.code} focus={open.focus} productUrl={pastedProductUrl(text)} onClose={() => setOpen(null)} />}
    </div>
  );
}
