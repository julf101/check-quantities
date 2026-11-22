import React, { useCallback, useEffect, useState } from 'react';
import Catalog from './pages/Catalog.jsx';
import Upload from './pages/Upload.jsx';
import { fetchStatus } from './api.js';
import { I18nProvider, LANGUAGES, useI18n } from './i18n/index.jsx';

function LanguagePicker() {
  const { lang, setLang, t } = useI18n();
  return (
    <div role="group" aria-label={t('lang.label')} className="flex rounded-lg border bg-white overflow-hidden">
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => setLang(l.code)}
          aria-pressed={lang === l.code}
          title={l.name}
          className={`px-3 py-1.5 text-sm ${lang === l.code ? 'bg-gray-800 text-white' : 'hover:bg-gray-50'}`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

function Shell() {
  const { t, formatDate } = useI18n();
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const onUploadPage = path === '/upload';
  const [lastImport, setLastImport] = useState(null);

  const refreshStatus = useCallback(() => {
    fetchStatus().then((s) => setLastImport(s.lastImport)).catch(() => {});
  }, []);
  useEffect(() => { refreshStatus(); }, [refreshStatus]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('app.title')}</h1>
          <p className="text-sm text-gray-600">{t('app.subtitle')}</p>
          {lastImport && (
            <p className="text-xs text-gray-500 mt-1" data-testid="last-update">
              {t('app.lastUpdate', { date: formatDate(lastImport.finishedAt) })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {onUploadPage && (
            <a href="/" className="px-4 py-1.5 rounded-lg text-sm bg-white border hover:bg-gray-50">{t('nav.back')}</a>
          )}
          <LanguagePicker />
        </div>
      </header>
      {onUploadPage ? <Upload onImported={refreshStatus} /> : <Catalog />}
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <Shell />
    </I18nProvider>
  );
}
