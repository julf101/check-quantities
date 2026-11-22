import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ProductImage from './components/ProductImage.jsx';
import FilterBar from './components/FilterBar.jsx';

afterEach(() => vi.restoreAllMocks());

describe('ProductImage', () => {
  beforeEach(() => { URL.createObjectURL = vi.fn(() => 'blob:real'); });

  it('shows the photo when the CDN has one', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, headers: new Headers(), blob: async () => new Blob(['x']) }));
    render(<ProductImage code="REAL-HERO" width={300} alt="Jacket" />);
    await waitFor(() => expect(screen.getByAltText('Jacket')).toHaveAttribute('src', 'blob:real'));
  });

  it('falls back when the CDN flags the image as missing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, headers: new Headers({ 'x-cld-error': 'Resource not found' }) }));
    render(<ProductImage code="MISSING-HERO" width={300} alt="Jacket" />);
    await waitFor(() => expect(screen.getByText("Pas d'image")).toBeInTheDocument());
  });

  it('falls back when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    render(<ProductImage code="OFFLINE-HERO" width={300} alt="Jacket" />);
    await waitFor(() => expect(screen.getByText("Pas d'image")).toBeInTheDocument());
  });
});

import ProductCard from './components/ProductCard.jsx';

describe('ProductCard', () => {
  const base = { code: 'NF0A8CV0', name: 'KID PERF FLEECE SET', gender: 'Kids', category: 'Bottom', season: 'FW26', total: 16, narrowed: true, matchedSizes: [],
    colors: [{ code: 'NF0A8CV0S9B1', label: 'MEDIUM PINK', imageCode: 'NF0A8CV0S9B-HERO', total: 16 }] };

  beforeEach(() => { vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, headers: new Headers() })); });

  it('shows the stock of the matched color, not the whole model', () => {
    render(<ProductCard item={base} onOpen={() => {}} />);
    expect(screen.getAllByText('16').length).toBeGreaterThan(0);
    expect(screen.getByText('MEDIUM PINK')).toBeInTheDocument();
    expect(screen.getByText('En stock')).toBeInTheDocument();
  });

  it('shows the matched size and its quantity for a material number search', () => {
    const item = { ...base, total: 12, matchedSizes: [{ size: '7', quantity: 12, materialNumberId: 'NF0A8CV0S9B1003', colorCode: 'NF0A8CV0S9B1' }] };
    const onOpen = vi.fn();
    render(<ProductCard item={item} onOpen={onOpen} />);
    expect(screen.getByText('12 en stock')).toBeInTheDocument();
    expect(screen.getByText(/MEDIUM PINK · 7/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button'));
    expect(onOpen).toHaveBeenCalledWith('NF0A8CV0', { colorCode: 'NF0A8CV0S9B1', materialNumberId: 'NF0A8CV0S9B1003' });
  });
});

describe('ProductCard with several colors', () => {
  it('lists the stock of each color and labels the total as the whole model', () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, headers: new Headers() }));
    const item = { code: 'NF0A8A48', name: 'B ANTORA RAIN JKT', gender: 'Kids', category: 'Outerwear', season: 'FW26', total: 197, narrowed: false, matchedSizes: [],
      colors: [{ code: 'A', label: 'MEDIUM BROWN', imageCode: 'x', total: 27 }, { code: 'B', label: 'BLACK', imageCode: 'y', total: 170 }] };
    render(<ProductCard item={item} onOpen={() => {}} />);
    expect(screen.getByText('MEDIUM BROWN').nextSibling).toHaveTextContent('27');
    expect(screen.getByText('BLACK').nextSibling).toHaveTextContent('170');
    expect(screen.getByText('Total (2 coloris)').nextSibling).toHaveTextContent('197');
  });
});

describe('FilterBar', () => {
  const facets = {
    gender: [{ value: 'Mens', count: 5 }, { value: 'Womens', count: 3 }],
    season: [{ value: 'FW27', count: 4 }, { value: 'SS27', count: 3 }, { value: 'FW26', count: 9 }, { value: 'SS26', count: 2 }],
    category: [{ value: 'Outerwear', count: 7 }],
    color: [{ value: 'BLACK', count: 6 }, { value: 'BROWN', count: 2 }],
    size: [{ value: 'S', count: 4 }, { value: 'XL', count: 3 }, { value: '090', count: 2 }]
  };
  const setup = (selected = {}, props = {}) => {
    const handlers = { onToggle: vi.fn(), onReplace: vi.fn(), onClear: vi.fn() };
    render(<FilterBar facets={facets} selected={selected} currentSeasons={['FW27', 'SS27', 'FW26', 'SS26']} {...handlers} {...props} />);
    return handlers;
  };

  it('toggles gender with quick buttons', () => {
    const h = setup();
    fireEvent.click(screen.getByRole('button', { name: /Femme/ }));
    expect(h.onToggle).toHaveBeenCalledWith('gender', 'Womens');
  });

  it('"Saisons actuelles" selects the four newest seasons, and clears them when active', () => {
    const h = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Saisons actuelles' }));
    expect(h.onReplace).toHaveBeenCalledWith('season', ['FW27', 'SS27', 'FW26', 'SS26']);
  });

  it('shows "Saisons actuelles" as active only when exactly those seasons are chosen', () => {
    setup({ season: ['SS26', 'FW26', 'SS27', 'FW27'] });
    expect(screen.getByRole('button', { name: 'Saisons actuelles' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('opens a dropdown, lists values with counts and reports the choice', () => {
    const h = setup();
    fireEvent.click(screen.getByRole('button', { name: /Saison ▾/ }));
    expect(screen.getByLabelText(/FW27 · Automne\/Hiver 2027/)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/SS26 · Printemps/));
    expect(h.onToggle).toHaveBeenCalledWith('season', 'SS26');
  });

  it('closes a dropdown with Escape', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /Catégorie/ }));
    expect(screen.getByRole('group', { name: 'Catégorie' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('group', { name: 'Catégorie' })).toBeNull();
  });

  it('has color swatches and letter-size pills; numeric sizes go in the Pointure dropdown', () => {
    const h = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Noir (6)' }));
    expect(h.onToggle).toHaveBeenCalledWith('color', 'BLACK');
    fireEvent.click(screen.getByRole('button', { name: 'XL' }));
    expect(h.onToggle).toHaveBeenCalledWith('size', 'XL');
    expect(screen.queryByRole('button', { name: '090' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Pointure/ }));
    expect(screen.getByLabelText(/US 9\.0/)).toBeInTheDocument();
  });

  it('shows removable tags for active filters and a reset link', () => {
    const h = setup({ gender: ['Mens'], color: ['BROWN'], size: ['S'] });
    fireEvent.click(screen.getByRole('button', { name: 'Retirer Marron' }));
    expect(h.onToggle).toHaveBeenCalledWith('color', 'BROWN');
    fireEvent.click(screen.getByText('Tout réinitialiser'));
    expect(h.onClear).toHaveBeenCalled();
  });

  it('shows no tags or reset link when nothing is selected', () => {
    setup();
    expect(screen.queryByText('Tout réinitialiser')).toBeNull();
  });
});
