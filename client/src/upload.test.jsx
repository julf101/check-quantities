import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import Upload, { validateFile } from './pages/Upload.jsx';
import { I18nProvider } from './i18n/index.jsx';

afterEach(() => vi.restoreAllMocks());

const file = (name, size = 100) => ({ name, size });
const choose = (f) => fireEvent.change(screen.getByLabelText(/Fichier à importer|File to import/), { target: { files: [f] } });
const renderUpload = (props) => render(<I18nProvider initial="fr"><Upload {...props} /></I18nProvider>);

describe('validateFile', () => {
  it('accepts csv and xlsx within 5 MB', () => {
    expect(validateFile(file('ATP.csv'))).toBeNull();
    expect(validateFile(file('ATP.XLSX', 5 * 1024 * 1024))).toBeNull();
  });
  it('returns an error code for other formats, empty files and files over 5 MB', () => {
    expect(validateFile(file('a.pdf')).code).toBe('UNSUPPORTED_FORMAT');
    expect(validateFile(file('a.csv', 5 * 1024 * 1024 + 1))).toEqual({ code: 'TOO_LARGE', params: { max: 5 } });
    expect(validateFile(file('a.csv', 0)).code).toBe('EMPTY_LOCAL');
  });
});

describe('Upload page', () => {
  const history = [
    { id: '1', filename: 'ATP-week-46.xlsx', format: 'xlsx', sizeBytes: 3 * 1024 * 1024, status: 'success', rows: 24117, fileStored: true,
      startedAt: '2026-11-22T10:00:00Z', finishedAt: '2026-11-22T10:00:07Z' },
    { id: '2', filename: 'bad.csv', format: 'csv', sizeBytes: 2048, status: 'failed', fileStored: false,
      errorCode: 'MISSING_COLUMNS', errorParams: { columns: 'Style' }, error: 'Colonnes manquantes dans le fichier : Style',
      startedAt: '2026-11-15T10:00:00Z', finishedAt: '2026-11-15T10:00:01Z' }
  ];
  const okJson = (data) => Promise.resolve({ ok: true, json: async () => data });

  it('shows the current data, the history, durations and download links', async () => {
    vi.stubGlobal('fetch', vi.fn(() => okJson(history)));
    renderUpload();
    expect((await screen.findAllByText('ATP-week-46.xlsx')).length).toBeGreaterThan(0);
    expect(screen.getByText(/importé le .* 24117 lignes/)).toBeInTheDocument();
    expect(screen.getByText('7 s')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Télécharger ATP-week-46.xlsx' })).toHaveAttribute('href', '/api/imports/1/file');
    // failed run: translated reason, no download link (file not stored)
    expect(screen.getByText('Colonnes manquantes dans le fichier : Style')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /bad\.csv/ })).toBeNull();
  });

  it('refuses a bad file without calling the server', async () => {
    const fetchMock = vi.fn(() => okJson([]));
    vi.stubGlobal('fetch', fetchMock);
    renderUpload();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    choose(new File(['x'], 'notes.txt'));
    expect(await screen.findByRole('alert')).toHaveTextContent(/csv ou \.xlsx/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('asks for confirmation before importing, and can be cancelled', async () => {
    const fetchMock = vi.fn(() => okJson([]));
    vi.stubGlobal('fetch', fetchMock);
    renderUpload();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    choose(new File(['x'], 'ATP.csv'));
    expect(await screen.findByText('Ce fichier remplacera tout le stock actuel.')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1); // nothing uploaded yet
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(screen.queryByText('Ce fichier remplacera tout le stock actuel.')).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('uploads after confirmation, waits for the import and reports the result', async () => {
    const onImported = vi.fn();
    const fetchMock = vi.fn((url, opts) => {
      if (opts?.method === 'POST') return okJson({ id: 'abc', status: 'running' });
      if (url === '/api/imports/abc') return okJson({ id: 'abc', status: 'success', rows: 100, skipped: 2 });
      return okJson([]);
    });
    vi.stubGlobal('fetch', fetchMock);
    renderUpload({ onImported });
    choose(new File(['x'], 'ATP.csv'));
    fireEvent.click(await screen.findByRole('button', { name: 'Importer' }));
    expect(await screen.findByText(/100 lignes importées \(2 ignorées\)/, {}, { timeout: 4000 })).toBeInTheDocument();
    expect(onImported).toHaveBeenCalled();
  });

  it('translates the server error code of a failed upload', async () => {
    const fetchMock = vi.fn((url, opts) => {
      if (opts?.method === 'POST') return Promise.resolve({ ok: false, json: async () => ({ code: 'TOO_LARGE', params: { max: 5 }, error: 'x' }) });
      return okJson([]);
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<I18nProvider initial="en"><Upload /></I18nProvider>);
    choose(new File(['x'], 'ATP.csv'));
    fireEvent.click(await screen.findByRole('button', { name: 'Import' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('File too large (maximum 5 MB).');
  });
});
