import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProductDetail from './components/ProductDetail.jsx';
import { I18nProvider } from './i18n/index.jsx';

const model = {
  code: 'NF0A8CV0', name: 'KID PERF FLEECE SET', gender: 'Kids', categoryGroup: 'Apparel', category: 'Bottom', season: 'FW26', total: 28,
  colors: [
    { code: 'NF0A8CV0S9B1', label: 'MEDIUM PINK', nrf: '660 - MEDIUM PINK', imageCode: 'a-HERO', total: 16, sizes: [
      { size: '7', quantity: 12, materialNumberId: 'NF0A8CV0S9B1003', materialNumberText: 'KID PERF FLEECE SET PRIMROSE/FERMEN, 7' },
      { size: '2', quantity: 1, materialNumberId: 'NF0A8CV0S9B1002', materialNumberText: 'KID PERF FLEECE SET PRIMROSE/FERMEN, 2' } ] },
    { code: 'NF0A8CV0RC71', label: 'BRIGHT BLUE', nrf: '430 - BRIGHT BLUE', imageCode: 'b-HERO', total: 12, sizes: [
      { size: 'M', quantity: 12, materialNumberId: 'NF0A8CV0RC71004', materialNumberText: 'KID PERF FLEECE SET BLUE, M' } ] }
  ]
};

let writeText;
beforeEach(() => {
  writeText = vi.fn().mockResolvedValue();
  Object.assign(navigator, { clipboard: { writeText } });
  vi.stubGlobal('fetch', vi.fn((url) => String(url).startsWith('/api/catalog/')
    ? Promise.resolve({ ok: true, json: async () => model })
    : Promise.resolve({ ok: false, headers: new Headers() })));
});
afterEach(() => vi.restoreAllMocks());

const open = (focus = {}, lang = 'fr') => render(<I18nProvider initial={lang}><ProductDetail code="NF0A8CV0" focus={focus} onClose={() => {}} /></I18nProvider>);

describe('ProductDetail copy button', () => {
  it('copies everything about a size as JSON', async () => {
    open();
    fireEvent.click(await screen.findByRole('button', { name: 'Copier toutes les informations de NF0A8CV0S9B1003 (JSON)' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(JSON.parse(writeText.mock.calls[0][0])).toEqual({
      name: 'KID PERF FLEECE SET PRIMROSE/FERMEN, 7',
      articleNumber: 'NF0A8CV0S9B1003',
      size: '7',
      color: '660 - MEDIUM PINK',
      quantity: 12,
      model: 'NF0A8CV0',
      modelName: 'KID PERF FLEECE SET',
      season: 'FW26',
      gender: 'Kids',
      category: 'Bottom'
    });
  });

  it('copies the data of the colour that is displayed', async () => {
    open();
    fireEvent.click(await screen.findByRole('button', { name: /BRIGHT BLUE/ }));
    fireEvent.click(screen.getByRole('button', { name: /NF0A8CV0RC71004/ }));
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    const json = JSON.parse(writeText.mock.calls[0][0]);
    expect(json).toMatchObject({ articleNumber: 'NF0A8CV0RC71004', color: '430 - BRIGHT BLUE', size: 'M', quantity: 12 });
  });

  it('falls back to the short colour name when the full text is missing', async () => {
    model.colors[0].nrf = undefined;
    open();
    fireEvent.click(await screen.findByRole('button', { name: /NF0A8CV0S9B1003/ }));
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(JSON.parse(writeText.mock.calls[0][0]).color).toBe('MEDIUM PINK');
    model.colors[0].nrf = '660 - MEDIUM PINK';
  });

  it('keeps the table simple (no extra panel) and highlights the searched size', async () => {
    open({ colorCode: 'NF0A8CV0S9B1', materialNumberId: 'NF0A8CV0S9B1002' });
    await screen.findByText('NF0A8CV0S9B1002');
    expect(screen.queryByRole('region')).toBeNull();
    expect(screen.getByText('NF0A8CV0S9B1002').closest('tr')).toHaveClass('bg-yellow-100');
    expect(screen.getByText('NF0A8CV0S9B1003').closest('tr')).not.toHaveClass('bg-yellow-100');
  });

  it('shows "Copié ✓" after copying and is translated', async () => {
    open({}, 'en');
    fireEvent.click(await screen.findByRole('button', { name: 'Copy all information for NF0A8CV0S9B1003 (JSON)' }));
    expect(await screen.findByText('Copied ✓')).toBeInTheDocument();
  });
});
