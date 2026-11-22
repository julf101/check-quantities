import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MAX_UPLOAD_BYTES, fetchImport, fetchImports, uploadFile } from '../api.js';

const ACCEPT = ['csv', 'xlsx'];

export function validateFile(file) {
  const ext = file.name.toLowerCase().split('.').pop();
  if (!ACCEPT.includes(ext)) return 'Format non supporté : utilisez un fichier .csv ou .xlsx.';
  if (file.size > MAX_UPLOAD_BYTES) return `Fichier trop volumineux (maximum ${MAX_UPLOAD_BYTES / 1024 / 1024} Mo).`;
  if (file.size === 0) return 'Ce fichier est vide.';
  return null;
}

const fmtDate = (d) => new Date(d).toLocaleString('fr-CH', { dateStyle: 'short', timeStyle: 'short' });
const fmtSize = (b) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} Mo` : `${Math.max(1, Math.round(b / 1024))} Ko`);
const STATUS = { running: 'En cours…', success: 'Réussi', failed: 'Échec' };
const STATUS_STYLE = { running: 'text-blue-700', success: 'text-green-700', failed: 'text-red-700' };

export default function Upload() {
  const [history, setHistory] = useState(null);
  const [message, setMessage] = useState(null); // { kind: 'error' | 'info' | 'success', text }
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const input = useRef(null);

  const loadHistory = useCallback(() => fetchImports().then(setHistory).catch(() => setHistory([])), []);
  useEffect(() => { loadHistory(); }, [loadHistory]);

  const poll = useCallback(async (id) => {
    for (;;) {
      await new Promise((r) => setTimeout(r, 1000));
      const run = await fetchImport(id);
      if (run.status === 'running') continue;
      return run;
    }
  }, []);

  const handleFile = async (file) => {
    if (!file || busy) return;
    const problem = validateFile(file);
    if (problem) return setMessage({ kind: 'error', text: problem });
    setBusy(true);
    setMessage({ kind: 'info', text: `Import de ${file.name} en cours…` });
    try {
      const started = await uploadFile(file);
      const run = await poll(started.id);
      setMessage(run.status === 'success'
        ? { kind: 'success', text: `Import terminé : ${run.rows} lignes importées${run.skipped ? ` (${run.skipped} ignorées)` : ''}.` }
        : { kind: 'error', text: run.error || "L'import a échoué." });
    } catch (e) {
      setMessage({ kind: 'error', text: e.message });
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
      loadHistory();
    }
  };

  const colors = { error: 'bg-red-50 border-red-500 text-red-800', info: 'bg-blue-50 border-blue-500 text-blue-800', success: 'bg-green-50 border-green-500 text-green-800' };

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-xl font-bold mb-1">Importer un fichier ATP</h2>
      <p className="text-sm text-gray-600 mb-4">
        Le fichier remplace tout le stock actuel. En cas d'erreur, les données existantes sont conservées.
      </p>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
        className={`bg-white border-2 border-dashed rounded-lg p-10 text-center ${dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
      >
        <p className="mb-3">Glissez un fichier CSV ou Excel ici, ou</p>
        <button
          onClick={() => input.current.click()}
          disabled={busy}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          Choisir un fichier
        </button>
        <input
          ref={input}
          type="file"
          accept=".csv,.xlsx"
          aria-label="Fichier à importer"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />
        <p className="text-xs text-gray-500 mt-3">.csv ou .xlsx, maximum 5 Mo</p>
      </div>

      {message && (
        <div role={message.kind === 'error' ? 'alert' : 'status'} className={`border-l-4 rounded p-4 mt-4 ${colors[message.kind]}`}>
          {message.text}
        </div>
      )}

      <h3 className="font-semibold mt-8 mb-2">Historique des imports</h3>
      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="p-3">Date</th><th>Fichier</th><th>Taille</th><th>Lignes</th><th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {history === null && <tr><td className="p-3" colSpan={5}>Chargement…</td></tr>}
            {history?.length === 0 && <tr><td className="p-3 text-gray-500" colSpan={5}>Aucun import pour le moment.</td></tr>}
            {history?.map((r) => (
              <tr key={r.id} className="border-b last:border-0 align-top">
                <td className="p-3 whitespace-nowrap">{fmtDate(r.startedAt)}</td>
                <td>{r.filename}</td>
                <td className="whitespace-nowrap">{fmtSize(r.sizeBytes)}</td>
                <td>{r.status === 'success' ? r.rows : '—'}</td>
                <td className={STATUS_STYLE[r.status]}>
                  {STATUS[r.status]}
                  {r.error && <div className="text-xs">{r.error}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
