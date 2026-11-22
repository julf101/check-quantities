/** Footwear sizes are stored as "090" (US 9.0) in the ATP file. */
export function formatSize(size) {
  const n = parseInt(size, 10);
  if (/^\d{3}$/.test(size) && n >= 30 && n <= 150) return `US ${(n / 10).toFixed(1)}`;
  return size;
}

/** If the user pastes a TNF product URL, search for its article code instead. */
export function normalizeQuery(text) {
  const m = /NF0[0A][A-Z0-9]{4}/.exec(text || '');
  return /^https?:\/\//i.test((text || '').trim()) && m ? m[0] : (text || '');
}

/** The pasted shop URL (trimmed) if the text is a product URL that contains a model code, else null. */
export function pastedProductUrl(text) {
  const url = (text || '').trim();
  return /^https?:\/\//i.test(url) && /NF0[0A][A-Z0-9]{4}/.test(url) ? url : null;
}

export const IMAGE_BASE = 'https://assets.thenorthface.eu/images/t_img';
export function imageUrl(imageCode, width) {
  return `${IMAGE_BASE}/c_fill,f_auto,w_${width}/${imageCode}/x.jpg`;
}

export const FACET_KEYS = ['gender', 'categoryGroup', 'category', 'collection', 'season', 'color', 'size'];

export const GENDERS = ['Mens', 'Womens', 'Kids', 'Unisex'];

export const COLOR_FAMILIES = {
  BLACK: '#111827', WHITE: '#ffffff', GREY: '#9ca3af', BEIGE: '#d6c3a3', BROWN: '#78512f',
  RED: '#dc2626', ORANGE: '#f97316', YELLOW: '#facc15', GREEN: '#16a34a', TEAL: '#14b8a6',
  BLUE: '#2563eb', PURPLE: '#9333ea', PINK: '#ec4899', OTHER: '#e5e7eb'
};

const LETTER_SIZES = ['XXXS', 'XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'OS'];
export const isLetterSize = (size) => LETTER_SIZES.includes(size);

/** FW27 -> "FW27 · Automne/Hiver 2027" (FW = Fall/Winter, SS = Spring/Summer). */
export function seasonName(code, i18n) {
  const m = /^(FW|SS)(\d{2})$/.exec(code || '');
  if (!m) return code;
  return `${code} · ${i18n.t(`season.${m[1]}`, { year: `20${m[2]}` })}`;
}

/** Human label for a filter value in the current language (unknown values are shown as-is). */
export function valueLabel(key, value, i18n) {
  const known = (k) => (i18n.has(k) ? i18n.t(k) : value);
  switch (key) {
    case 'gender': return known(`gender.${value}`);
    case 'color': return known(`color.${value}`);
    case 'categoryGroup': return known(`group.${value}`);
    case 'category': return known(`category.${value}`);
    case 'season': return seasonName(value, i18n);
    case 'size': return formatSize(value);
    default: return value;
  }
}
