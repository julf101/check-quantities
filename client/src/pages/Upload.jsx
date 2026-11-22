import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MAX_UPLOAD_BYTES, fetchImport, fetchImports, uploadFile } from '../api.js';
import { useI18n } from '../i18n/index.jsx';

const ACCEPT = ['csv', 'xlsx'];
const FILES_KEPT = 12; // the server keeps the files of the last 12 imports
const MAX_MB = MAX_UPLOAD_BYTES / 1024 / 1024;

/** Returns { code, params } describing why a file is refused, or null if it is fine. */
export function validateFile(file) {
  const ext = file.name.toLowerCase().split('.').pop();
  if (!ACCEPT.includes(ext)) return { code: 'UNSUPPORTED_FORMAT' };
  if (file.size > MAX_UPLOAD_BYTES) return { code: 'TOO_LARGE', params: { max: MAX_MB } };
  if (file.size === 0) return { code: 'EMPTY_LOCAL' };
  return null;
}

const fmtSize = (b) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const STATUS_STYLE = {
  running: 'bg-blue-50 text-blue-700 border-blue-200',
  success: 'bg-green-50 text-green-700 border-green-200',
  failed: 'bg-red-50 text-red-700 border-red-200'
};

function Spinner() {
  return <span aria-hidden="true" className="inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />;
}

function DownloadIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="w-4 h-4" fill="currentColor">
      <path d="M10 2a1 1 0 0 1 1 1v8.6l2.3-2.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L9 11.6V3a1 1 0 0 1 1-1zM4 15a1 1 0 0 1 1 1v1h10v-1a1 1 0 1 1 2 0v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1a1 1 0 0 1 1-1z" />
    </svg>
  );
}

export default function Upload({ onImported = () => {} }) {
  const { t, formatDate } = useI18n();
  const [history, setHistory] = useState(null);
  const [file, setFile] = useState(null); // chosen, waiting for confirmation
  const [message, setMessage] = useState(null); // { kind: 'error' | 'success', text }
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const input = useRef(null);

  const errorText = useCallback((code, params, fallback) => {
    const key = `error.${code}`;
    return code ? t(key, params) : (fallback || t('error.INTERNAL'));
  }, [t]);

  const loadHistory = useCallback(() => fetchImports().then(setHistory).catch(() => setHistory([])), []);
  useEffect(() => { loadHistory(); }, [loadHistory]);

  const choose = (candidate) => {
    if (!candidate || busy) return;
    setMessage(null);
    const problem = validateFile(candidate);
    if (problem) {
      setFile(null);
      setMessage({ kind: 'error', text: t(`error.${problem.code}`, problem.params) });
      return;
    }
    setFile(candidate);
  };

  const reset = () => {
    setFile(null);
    if (input.current) input.current.value = '';
  };

  const poll = useCallback(async (id) => {
    for (;;) {
      await new Promise((r) => setTimeout(r, 1000));
      const run = await fetchImport(id);
      if (run.status !== 'running') return run;
    }
  }, []);

  const start = async () => {
    if (!file || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const started = await uploadFile(file);
      const run = await poll(started.id);
      setMessage(run.status === 'success'
        ? { kind: 'success', text: t(run.skipped ? 'upload.successSkipped' : 'upload.success', { rows: run.rows, skipped: run.skipped }) }
        : { kind: 'error', text: errorText(run.errorCode, run.errorParams, run.error || t('upload.failed')) });
    } catch (e) {
      setMessage({ kind: 'error', text: errorText(e.code, e.params, t('upload.failed')) });
    } finally {
      setBusy(false);
      reset();
      loadHistory();
      onImported();
    }
  };

  const current = history?.find((r) => r.status === 'success');
  const banner = { error: 'bg-red-50 border-red-500 text-red-800', success: 'bg-green-50 border-green-500 text-green-800' };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1">{t('upload.title')}</h2>
        <p className="text-sm text-gray-600">{t('upload.intro')}</p>
      </div>

      <section aria-label={t('upload.current')} className="bg-white rounded-lg shadow-sm p-4 flex items-start gap-3">
        <span aria-hidden="true" className="mt-1 w-2.5 h-2.5 rounded-full bg-green-500" />
        <div>
          <div className="text-xs uppercase tracking-wide text-gray-500">{t('upload.current')}</div>
          {history === null && <div className="text-sm">{t('upload.loading')}</div>}
          {history && current && (
            <div className="text-sm">
              {t('upload.currentDetail', { name: current.filename, date: formatDate(current.finishedAt || current.startedAt), rows: current.rows })}
            </div>
          )}
          {history && !current && <div className="text-sm text-gray-500">{t('upload.noCurrent')}</div>}
        </div>
      </section>

      <section
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); choose(e.dataTransfer.files[0]); }}
        className={`bg-white border-2 border-dashed rounded-lg p-8 text-center transition ${dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
      >
        {busy ? (
          <div role="status" className="flex items-center justify-center gap-3 py-4">
            <Spinner />
            <span>{t('upload.importing', { name: file?.name || '' })}</span>
          </div>
        ) : file ? (
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">{t('upload.ready')}</div>
            <div className="inline-flex items-center gap-3 border rounded-lg px-4 py-2 bg-gray-50 mb-3">
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-gray-800 text-white uppercase">{file.name.split('.').pop()}</span>
              <span className="font-medium">{file.name}</span>
              <span className="text-sm text-gray-500">{fmtSize(file.size)}</span>
            </div>
            <p className="text-sm text-amber-700 mb-4">{t('upload.warn')}</p>
            <div className="flex justify-center gap-3">
              <button onClick={start} className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{t('upload.import')}</button>
              <button onClick={reset} className="px-5 py-2 bg-white border rounded-lg hover:bg-gray-50">{t('upload.cancel')}</button>
            </div>
          </div>
        ) : (
          <div>
            <p className="mb-3">{t('upload.drop')}</p>
            <button onClick={() => input.current.click()} className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              {t('upload.choose')}
            </button>
            <p className="text-xs text-gray-500 mt-3">{t('upload.hint', { max: MAX_MB })}</p>
          </div>
        )}
        <input
          ref={input}
          type="file"
          accept=".csv,.xlsx"
          aria-label={t('upload.fileLabel')}
          className="hidden"
          onChange={(e) => choose(e.target.files[0])}
        />
      </section>

      {message && (
        <div role={message.kind === 'error' ? 'alert' : 'status'} className={`border-l-4 rounded p-4 ${banner[message.kind]}`}>
          {message.text}
        </div>
      )}

      <section>
        <h3 className="font-semibold mb-2">{t('upload.history')}</h3>
        <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="p-3">{t('upload.col.date')}</th>
                <th>{t('upload.col.file')}</th>
                <th>{t('upload.col.size')}</th>
                <th>{t('upload.col.rows')}</th>
                <th>{t('upload.col.duration')}</th>
                <th>{t('upload.col.status')}</th>
                <th><span className="sr-only">{t('upload.col.download')}</span></th>
              </tr>
            </thead>
            <tbody>
              {history === null && <tr><td className="p-3" colSpan={7}>{t('upload.loading')}</td></tr>}
              {history?.length === 0 && <tr><td className="p-3 text-gray-500" colSpan={7}>{t('upload.none')}</td></tr>}
              {history?.map((r) => {
                const seconds = r.finishedAt ? Math.max(1, Math.round((new Date(r.finishedAt) - new Date(r.startedAt)) / 1000)) : null;
                return (
                  <tr key={r.id} className="border-b last:border-0 align-top">
                    <td className="p-3 whitespace-nowrap">{formatDate(r.startedAt)}</td>
                    <td className="py-3 pr-3 break-all">{r.filename}</td>
                    <td className="whitespace-nowrap">{fmtSize(r.sizeBytes)}</td>
                    <td>{r.status === 'success' ? r.rows : '—'}</td>
                    <td className="whitespace-nowrap">{seconds ? t('upload.seconds', { count: seconds }) : '—'}</td>
                    <td className="py-3 pr-3">
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLE[r.status]}`}>{t(`status.${r.status}`)}</span>
                      {r.status === 'failed' && (
                        <div className="text-xs text-red-700 mt-1">{errorText(r.errorCode, r.errorParams, r.error)}</div>
                      )}
                    </td>
                    <td className="pr-3 text-right">
                      {r.fileStored ? (
                        <a
                          href={`/api/imports/${r.id}/file`}
                          download
                          aria-label={t('upload.download', { name: r.filename })}
                          title={t('upload.downloadShort')}
                          className="inline-flex p-2 rounded hover:bg-gray-100 text-gray-600"
                        >
                          <DownloadIcon />
                        </a>
                      ) : (
                        <span title={t('upload.expired', { count: FILES_KEPT })} className="text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
