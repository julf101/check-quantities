import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import fr from './fr.js';
import en from './en.js';
import it from './it.js';

export const DICTIONARIES = { fr, it, en };
export const LANGUAGES = [
  { code: 'fr', label: 'FR', name: 'Français', locale: 'fr-CH' },
  { code: 'it', label: 'IT', name: 'Italiano', locale: 'it-CH' },
  { code: 'en', label: 'EN', name: 'English', locale: 'en-GB' }
];
export const DEFAULT_LANGUAGE = 'fr';
const STORAGE_KEY = 'atp-stock-lang';

const fill = (text, vars) => text.replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] !== undefined ? vars[k] : m));

/** Looks a key up in the language, then in French, then returns the key itself. */
export function translate(lang, key, vars) {
  const dict = DICTIONARIES[lang] || DICTIONARIES[DEFAULT_LANGUAGE];
  const pluralKey = vars && vars.count === 1 ? `${key}_one` : null;
  const text = (pluralKey && dict[pluralKey]) || dict[key] || DICTIONARIES[DEFAULT_LANGUAGE][key] || key;
  return fill(text, vars);
}

const localeOf = (lang) => (LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0]).locale;

function makeApi(lang, setLang) {
  const locale = localeOf(lang);
  return {
    lang,
    setLang,
    locale,
    t: (key, vars) => translate(lang, key, vars),
    has: (key) => key in (DICTIONARIES[lang] || {}) || key in DICTIONARIES[DEFAULT_LANGUAGE],
    formatDate: (value) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  };
}

const I18nContext = createContext(makeApi(DEFAULT_LANGUAGE, () => {}));

function readStoredLanguage() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return DICTIONARIES[stored] ? stored : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE; // storage blocked: fall back to the default
  }
}

export function I18nProvider({ children, initial }) {
  const [lang, setLangState] = useState(initial || readStoredLanguage);

  const setLang = useCallback((code) => {
    if (!DICTIONARIES[code]) return;
    setLangState(code);
    try { window.localStorage.setItem(STORAGE_KEY, code); } catch { /* ignore */ }
  }, []);

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const api = useMemo(() => makeApi(lang, setLang), [lang, setLang]);
  return <I18nContext.Provider value={api}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
