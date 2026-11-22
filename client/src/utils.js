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

export const IMAGE_BASE = 'https://assets.thenorthface.eu/images/t_img';
export function imageUrl(imageCode, width) {
  return `${IMAGE_BASE}/c_fill,f_auto,w_${width}/${imageCode}/x.jpg`;
}

export const FACET_LABELS = {
  gender: 'Genre',
  categoryGroup: 'Type',
  category: 'Catégorie',
  collection: 'Collection',
  season: 'Saison',
  color: 'Couleur',
  size: 'Taille'
};

export const GENDERS = [
  { value: 'Mens', label: 'Homme' },
  { value: 'Womens', label: 'Femme' },
  { value: 'Kids', label: 'Enfant' },
  { value: 'Unisex', label: 'Unisexe' }
];

export const COLOR_FAMILIES = {
  BLACK: { label: 'Noir', hex: '#111827' },
  WHITE: { label: 'Blanc', hex: '#ffffff' },
  GREY: { label: 'Gris', hex: '#9ca3af' },
  BEIGE: { label: 'Beige', hex: '#d6c3a3' },
  BROWN: { label: 'Marron', hex: '#78512f' },
  RED: { label: 'Rouge', hex: '#dc2626' },
  ORANGE: { label: 'Orange', hex: '#f97316' },
  YELLOW: { label: 'Jaune', hex: '#facc15' },
  GREEN: { label: 'Vert', hex: '#16a34a' },
  TEAL: { label: 'Turquoise', hex: '#14b8a6' },
  BLUE: { label: 'Bleu', hex: '#2563eb' },
  PURPLE: { label: 'Violet', hex: '#9333ea' },
  PINK: { label: 'Rose', hex: '#ec4899' },
  OTHER: { label: 'Autre', hex: '#e5e7eb' }
};

const LETTER_SIZES = ['XXXS', 'XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'OS'];
export const isLetterSize = (size) => LETTER_SIZES.includes(size);

/** Human label for a filter value (used by the filter bar and the active-filter tags). */
export function valueLabel(key, value) {
  if (key === 'gender') return GENDERS.find((g) => g.value === value)?.label || value;
  if (key === 'season') return seasonName(value);
  if (key === 'color') return COLOR_FAMILIES[value]?.label || value;
  if (key === 'size') return formatSize(value);
  return value;
}
export const FACET_KEYS = Object.keys(FACET_LABELS);

/** FW27 -> "FW27 · Automne/Hiver 2027" (FW = Fall/Winter, SS = Spring/Summer). */
export function seasonName(code) {
  const m = /^(FW|SS)(\d{2})$/.exec(code || '');
  if (!m) return code;
  return `${code} · ${m[1] === 'FW' ? 'Automne/Hiver' : 'Printemps/Été'} 20${m[2]}`;
}
