import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import frDict from './i18n/fr.js';
import enDict from './i18n/en.js';
import itDict from './i18n/it.js';
import { translate, I18nProvider } from './i18n/index.jsx';
import { seasonName, valueLabel } from './utils.js';
import App from './App.jsx';

afterEach(() => { vi.restoreAllMocks(); window.localStorage.clear(); });

describe('dictionaries', () => {
  it('French, English and Italian define exactly the same keys', () => {
    const keys = Object.keys(frDict).sort();
    expect(Object.keys(enDict).sort()).toEqual(keys);
    expect(Object.keys(itDict).sort()).toEqual(keys);
  });

  it('keeps the placeholders ({count}, {date}…) identical in every language', () => {
    const vars = (s) => (s.match(/\{\w+\}/g) || []).sort().join();
    for (const key of Object.keys(frDict)) {
      expect(vars(enDict[key]), key).toBe(vars(frDict[key]));
      expect(vars(itDict[key]), key).toBe(vars(frDict[key]));
    }
  });
});

describe('translate', () => {
  it('fills variables, uses singular forms and falls back to the key', () => {
    expect(translate('fr', 'catalog.count', { count: 5 })).toBe('5 articles');
    expect(translate('fr', 'catalog.count', { count: 1 })).toBe('1 article');
    expect(translate('it', 'catalog.count', { count: 1 })).toBe('1 articolo');
    expect(translate('en', 'filters.remove', { value: 'Black' })).toBe('Remove Black');
    expect(translate('en', 'no.such.key')).toBe('no.such.key');
  });
  it('defaults to French for an unknown language', () => {
    expect(translate('de', 'nav.back')).toBe('← Catalogue');
  });
});

describe('labels', () => {
  const make = (lang) => ({ t: (k, v) => translate(lang, k, v), has: (k) => k in { fr: frDict, en: enDict, it: itDict }[lang] });
  it('translates seasons, genders and colours, and leaves unknown values alone', () => {
    expect(seasonName('FW27', make('fr'))).toBe('FW27 · Automne/Hiver 2027');
    expect(seasonName('SS26', make('en'))).toBe('SS26 · Spring/Summer 2026');
    expect(seasonName('FW26', make('it'))).toBe('FW26 · Autunno/Inverno 2026');
    expect(valueLabel('gender', 'Womens', make('it'))).toBe('Donna');
    expect(valueLabel('color', 'BROWN', make('en'))).toBe('Brown');
    expect(valueLabel('category', 'Mystery Item', make('fr'))).toBe('Mystery Item');
  });
});

describe('App', () => {
  const stubFetch = () => vi.stubGlobal('fetch', vi.fn((url) => {
    const body = String(url).startsWith('/api/status')
      ? { lastImport: { filename: 'ATP.xlsx', rows: 10, finishedAt: '2026-11-22T11:22:00Z' } }
      : { items: [], total: 0, page: 1, pageSize: 48, facets: {}, currentSeasons: [] };
    return Promise.resolve({ ok: true, json: async () => body, headers: new Headers() });
  }));

  it('starts in French, shows the last upload date and no link to the upload page', async () => {
    stubFetch();
    render(<App />);
    expect(await screen.findByTestId('last-update')).toHaveTextContent(/Stock mis à jour le .*2026/);
    expect(screen.getByText('ATP Stock')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /import/i })).toBeNull();
    expect(document.documentElement.lang).toBe('fr');
  });

  it('switches language with the picker and remembers the choice', async () => {
    stubFetch();
    const { unmount } = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'IT' }));
    expect(await screen.findByText("Articoli disponibili nell'ultimo file ATP.")).toBeInTheDocument();
    expect(await screen.findByTestId('last-update')).toHaveTextContent(/Stock aggiornato il/);
    expect(document.documentElement.lang).toBe('it');
    unmount();
    render(<App />); // new session reads the stored choice
    expect(await screen.findByText("Articoli disponibili nell'ultimo file ATP.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'EN' }));
    expect(await screen.findByText('Items available in the latest ATP file.')).toBeInTheDocument();
  });

  it('works when browser storage is blocked', async () => {
    stubFetch();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    render(<App />);
    expect(screen.getByText('Articles disponibles dans le dernier fichier ATP.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'EN' }));
    expect(await screen.findByText('Items available in the latest ATP file.')).toBeInTheDocument();
  });
});
