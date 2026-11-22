import React, { useEffect, useState } from 'react';
import { fetchModel } from '../api.js';
import { formatSize, valueLabel } from '../utils.js';
import { useI18n } from '../i18n/index.jsx';
import ProductImage from './ProductImage.jsx';

function CopyButton({ text, label }) {
  const { t } = useI18n();
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch { /* clipboard unavailable */ }
  };
  return (
    <button onClick={copy} aria-label={label} className="text-xs px-2 py-1 border rounded hover:bg-gray-50">
      {done ? t('detail.copied') : t('detail.copy')}
    </button>
  );
}

export default function ProductDetail({ code, focus = {}, onClose }) {
  const i18n = useI18n();
  const { t } = i18n;
  const [model, setModel] = useState(null);
  const [error, setError] = useState(false);
  const [colorCode, setColorCode] = useState(null);

  useEffect(() => {
    let live = true;
    fetchModel(code)
      .then((m) => { if (live) { setModel(m); setColorCode(m.colors.some((c) => c.code === focus.colorCode) ? focus.colorCode : m.colors[0]?.code); } })
      .catch(() => live && setError(true));
    return () => { live = false; };
  }, [code]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const color = model?.colors.find((c) => c.code === colorCode);

  return (
    <div className="fixed inset-0 bg-black/50 z-10 flex items-start justify-center overflow-y-auto p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-label={t('detail.title')}
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl my-8 p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} aria-label={t('detail.close')} className="absolute top-3 right-4 text-2xl text-gray-400 hover:text-gray-700">×</button>
        {error && <p className="text-red-700">{t('detail.error')}</p>}
        {!model && !error && <p>{t('detail.loading')}</p>}
        {model && color && (
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <ProductImage code={color.imageCode} width={600} alt={`${model.name} ${color.label}`} className="w-full aspect-[4/5] rounded" />
              <div className="flex flex-wrap gap-2 mt-3">
                {model.colors.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => setColorCode(c.code)}
                    aria-pressed={c.code === colorCode}
                    className={`w-16 rounded border-2 overflow-hidden bg-white text-center ${c.code === colorCode ? 'border-blue-500' : 'border-transparent'}`}
                    title={c.label}
                  >
                    <ProductImage code={c.imageCode} width={120} alt={c.label} className="w-full aspect-[4/5]" />
                    <span className="block text-xs py-0.5">{c.total}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold">{model.name}</h2>
              <p className="text-sm text-gray-500 mb-1">{valueLabel('gender', model.gender, i18n)} · {valueLabel('categoryGroup', model.categoryGroup, i18n)} / {valueLabel('category', model.category, i18n)} · {model.season}</p>
              <p className="text-sm">{t('detail.color')} : <strong>{color.label}</strong> <span className="text-gray-400">({color.code})</span></p>
              <p className="text-sm mb-4">
                {t('detail.colorStock')} : <strong className="text-green-700">{color.total}</strong>
                {model.colors.length > 1 && <span className="text-gray-500"> · {t('detail.modelTotal', { count: model.colors.length })} : {model.total}</span>}
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-1">{t('detail.size')}</th><th>{t('detail.stock')}</th><th>{t('detail.material')}</th><th />
                  </tr>
                </thead>
                <tbody>
                  {color.sizes.map((s) => (
                    <tr key={s.materialNumberId} className={`border-b last:border-0 ${s.materialNumberId === focus.materialNumberId ? 'bg-yellow-100' : ''}`}>
                      <td className="py-2 font-medium">{formatSize(s.size)}</td>
                      <td>{s.quantity}</td>
                      <td className="font-mono text-xs">{s.materialNumberId}</td>
                      <td className="text-right"><CopyButton text={s.materialNumberId} label={t('detail.copyAria', { id: s.materialNumberId })} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
