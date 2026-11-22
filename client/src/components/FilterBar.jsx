import React, { useEffect, useRef, useState } from 'react';
import { COLOR_FAMILIES, FACET_KEYS, FACET_LABELS, GENDERS, isLetterSize, valueLabel } from '../utils.js';

const pill = (active, disabled) =>
  `px-3 py-1.5 rounded-full text-sm border transition ${
    active ? 'bg-gray-800 text-white border-gray-800' : 'bg-white hover:bg-gray-50'
  } ${disabled ? 'opacity-40 pointer-events-none' : ''}`;

function Dropdown({ label, entries, selected = [], onToggle, format }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (e.type === 'keydown' ? e.key === 'Escape' : !ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [open]);

  if (!entries.length && !selected.length) return null;
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={`px-3 py-1.5 rounded-lg text-sm border bg-white hover:bg-gray-50 ${selected.length ? 'border-gray-800 font-medium' : ''}`}
      >
        {label}{selected.length > 0 && ` (${selected.length})`} ▾
      </button>
      {open && (
        <div role="group" aria-label={label} className="absolute z-20 mt-1 w-64 max-h-72 overflow-y-auto bg-white border rounded-lg shadow-lg p-2">
          {entries.map(({ value, count }) => (
            <label key={value} className="flex items-center gap-2 px-2 py-1 text-sm rounded hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" checked={selected.includes(value)} onChange={() => onToggle(value)} />
              <span className="flex-1">{format ? format(value) : value}</span>
              <span className="text-gray-400">{count}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FilterBar({ facets, selected, currentSeasons = [], onToggle, onReplace, onClear }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const f = (key) => facets?.[key] || [];
  const sel = (key) => selected[key] || [];
  const activeCount = FACET_KEYS.reduce((n, k) => n + sel(k).length, 0);

  const genderCount = (v) => f('gender').find((e) => e.value === v)?.count || 0;
  const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
  const currentOn = currentSeasons.length > 0 && sameSet(sel('season'), currentSeasons);

  const letterSizes = f('size').filter((e) => isLetterSize(e.value));
  const otherSizes = f('size').filter((e) => !isLetterSize(e.value));
  const colorEntries = f('color');

  return (
    <section aria-label="Filtres" className="mb-6">
      <button
        type="button"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-expanded={mobileOpen}
        className="md:hidden w-full mb-3 px-4 py-2 bg-white border rounded-lg text-left"
      >
        Filtres{activeCount > 0 && ` (${activeCount})`} {mobileOpen ? '▴' : '▾'}
      </button>

      <div className={`${mobileOpen ? 'block' : 'hidden'} md:block space-y-3`}>
        {/* quick choices */}
        <div className="flex flex-wrap items-center gap-2">
          {GENDERS.map((g) => (
            <button
              key={g.value}
              type="button"
              aria-pressed={sel('gender').includes(g.value)}
              onClick={() => onToggle('gender', g.value)}
              className={pill(sel('gender').includes(g.value), genderCount(g.value) === 0 && !sel('gender').includes(g.value))}
            >
              {g.label} <span className="opacity-60">{genderCount(g.value)}</span>
            </button>
          ))}
          <span className="w-px h-6 bg-gray-300 mx-1" aria-hidden="true" />
          <button
            type="button"
            aria-pressed={currentOn}
            onClick={() => onReplace('season', currentOn ? [] : currentSeasons)}
            title={currentSeasons.join(', ')}
            className={pill(currentOn, currentSeasons.length === 0)}
          >
            Saisons actuelles
          </button>
        </div>

        {/* dropdowns for the longer lists */}
        <div className="flex flex-wrap items-center gap-2">
          {['categoryGroup', 'category', 'season', 'collection'].map((key) => (
            <Dropdown
              key={key}
              label={FACET_LABELS[key]}
              entries={f(key)}
              selected={sel(key)}
              onToggle={(v) => onToggle(key, v)}
              format={(v) => valueLabel(key, v)}
            />
          ))}
          <Dropdown
            label="Pointure"
            entries={otherSizes}
            selected={sel('size').filter((v) => !isLetterSize(v))}
            onToggle={(v) => onToggle('size', v)}
            format={(v) => valueLabel('size', v)}
          />
        </div>

        {/* colors */}
        {colorEntries.length > 0 && (
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Couleur">
            <span className="text-sm text-gray-600 mr-1">Couleur</span>
            {colorEntries.map(({ value, count }) => {
              const fam = COLOR_FAMILIES[value] || COLOR_FAMILIES.OTHER;
              const on = sel('color').includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={on}
                  aria-label={`${fam.label} (${count})`}
                  title={`${fam.label} (${count})`}
                  onClick={() => onToggle('color', value)}
                  className={`w-7 h-7 rounded-full border ${on ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
                  style={{ backgroundColor: fam.hex }}
                />
              );
            })}
          </div>
        )}

        {/* sizes */}
        {letterSizes.length > 0 && (
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Taille">
            <span className="text-sm text-gray-600 mr-1">Taille</span>
            {letterSizes.map(({ value, count }) => (
              <button
                key={value}
                type="button"
                aria-pressed={sel('size').includes(value)}
                title={`${count} articles`}
                onClick={() => onToggle('size', value)}
                className={`min-w-[2.5rem] ${pill(sel('size').includes(value))}`}
              >
                {value}
              </button>
            ))}
          </div>
        )}

        {/* active filters */}
        {activeCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1" aria-label="Filtres actifs">
            {FACET_KEYS.flatMap((key) =>
              sel(key).map((value) => (
                <button
                  key={`${key}:${value}`}
                  type="button"
                  onClick={() => onToggle(key, value)}
                  aria-label={`Retirer ${valueLabel(key, value)}`}
                  className="px-2.5 py-1 text-xs rounded-full bg-blue-50 border border-blue-200 text-blue-800 hover:bg-blue-100"
                >
                  {valueLabel(key, value)} ×
                </button>
              ))
            )}
            <button type="button" onClick={onClear} className="text-sm text-blue-600 hover:underline">
              Tout réinitialiser
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
