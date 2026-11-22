import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Upload, { validateFile } from './pages/Upload.jsx';

afterEach(() => vi.restoreAllMocks());

const file = (name, size = 100) => ({ name, size });

describe('validateFile', () => {
  it('accepts csv and xlsx within 5 MB', () => {
    expect(validateFile(file('ATP.csv'))).toBeNull();
    expect(validateFile(file('ATP.XLSX', 5 * 1024 * 1024))).toBeNull();
  });
  it('rejects other formats, empty files and files over 5 MB', () => {
    expect(validateFile(file('a.pdf'))).toMatch(/csv ou \.xlsx/);
    expect(validateFile(file('a.csv', 5 * 1024 * 1024 + 1))).toMatch(/5 Mo/);
    expect(validateFile(file('a.csv', 0))).toMatch(/vide/);
  });
});

describe('Upload page', () => {
  const history = [
    { id: '1', filename: 'ATP-week-46.xlsx', format: 'xlsx', sizeBytes: 3 * 1024 * 1024, status: 'success', rows: 24117, startedAt: '2026-11-22T10:00:00Z' },
    { id: '2', filename: 'bad.csv', format: 'csv', sizeBytes: 2048, status: 'failed', error: 'Colonnes manquantes dans le fichier : Style', startedAt: '2026-11-15T10:00:00Z' }
  ];

  it('shows the import history, including failures with their reason', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => history }));
    render(<Upload />);
    expect(await screen.findByText('ATP-week-46.xlsx')).toBeInTheDocument();
    expect(screen.getByText('24117')).toBeInTheDocument();
    expect(screen.getByText(/Colonnes manquantes/)).toBeInTheDocument();
  });

  it('refuses a bad file without calling the server', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
    vi.stubGlobal('fetch', fetchMock);
    render(<Upload />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByLabelText('Fichier à importer'), { target: { files: [new File(['x'], 'notes.txt')] } });
    expect(await screen.findByRole('alert')).toHaveTextContent(/csv ou \.xlsx/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('uploads, waits for the import and reports the result', async () => {
    const fetchMock = vi.fn((url, opts) => {
      if (opts?.method === 'POST') return Promise.resolve({ ok: true, json: async () => ({ id: 'abc', status: 'running' }) });
      if (url === '/api/imports/abc') return Promise.resolve({ ok: true, json: async () => ({ id: 'abc', status: 'success', rows: 100, skipped: 2 }) });
      return Promise.resolve({ ok: true, json: async () => [] });
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<Upload />);
    fireEvent.change(screen.getByLabelText('Fichier à importer'), { target: { files: [new File(['x'], 'ATP.csv')] } });
    expect(await screen.findByText(/100 lignes importées \(2 ignorées\)/, {}, { timeout: 4000 })).toBeInTheDocument();
  });

  it('shows the server reason when the import fails', async () => {
    const fetchMock = vi.fn((url, opts) => {
      if (opts?.method === 'POST') return Promise.resolve({ ok: false, json: async () => ({ error: 'Fichier trop volumineux (maximum 5 Mo).' }) });
      return Promise.resolve({ ok: true, json: async () => [] });
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<Upload />);
    fireEvent.change(screen.getByLabelText('Fichier à importer'), { target: { files: [new File(['x'], 'ATP.csv')] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('trop volumineux');
  });
});
