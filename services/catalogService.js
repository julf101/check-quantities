const Atp = require('../models/Atp');

const SIZE_ORDER = ['XXXS', 'XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'OS'];
const CATEGORY_GROUPS = { APP: 'Apparel', FTW: 'Footwear', ACC: 'Accessories', EQU: 'Equipment', OTH: 'Other' };
const PAGE_SIZE = 48;

const stripCode = (s) => (s || '').replace(/^\s*[A-Z0-9]+\s-\s/, '').trim();

function compareSizes(a, b) {
  const ia = SIZE_ORDER.indexOf(a);
  const ib = SIZE_ORDER.indexOf(b);
  if (ia !== -1 && ib !== -1) return ia - ib;
  if (ia !== -1) return -1;
  if (ib !== -1) return 1;
  const na = parseFloat(a);
  const nb = parseFloat(b);
  if (!isNaN(na) && !isNaN(nb)) return na - nb;
  return String(a).localeCompare(String(b));
}

function seasonLabel(code) {
  const m = /^([FS])0?(\d{4})$/.exec(code || '');
  return m ? `${m[1] === 'F' ? 'FW' : 'SS'}${m[2].slice(2)}` : (code || '');
}

/** Chronological rank so seasons can be sorted: SS26 < FW26 < SS27 < FW27. */
function seasonRank(label) {
  const m = /^(FW|SS)(\d{2})$/.exec(label || '');
  return m ? parseInt(m[2], 10) * 2 + (m[1] === 'FW' ? 1 : 0) : 0;
}

/** 52 TNF color names -> a short list of families for the filter. */
const FAMILY_RULES = [
  [/^(MISC|NO COLOR)$/, 'OTHER'],
  [/BLACK/, 'BLACK'], [/WHITE/, 'WHITE'], [/GREY|GRAY/, 'GREY'],
  [/BEIGE|TAUPE|NATURAL/, 'BEIGE'], [/BROWN/, 'BROWN'],
  [/RED|BURGUNDY/, 'RED'], [/ORANGE|RUST|COPPER/, 'ORANGE'], [/YELLOW|GOLD/, 'YELLOW'],
  [/TEAL|TURQUOISE|AQUA/, 'TEAL'], [/GREEN|OLIVE/, 'GREEN'],
  [/BLUE|NAVY/, 'BLUE'], [/PURPLE/, 'PURPLE'], [/PINK/, 'PINK']
];
function colorFamily(label) {
  const l = String(label || '').toUpperCase();
  const rule = FAMILY_RULES.find(([re]) => re.test(l));
  return rule ? rule[1] : 'OTHER';
}

function categoryInfo(raw) {
  const label = stripCode(raw);
  const [prefix, ...rest] = label.split('_');
  if (rest.length && CATEGORY_GROUPS[prefix]) {
    return { group: CATEGORY_GROUPS[prefix], name: rest.join('_').trim() };
  }
  // e.g. "NF Unisex Bags and Backpacks"
  if (/bags|backpacks|luggage/i.test(label)) {
    return { group: 'Bags', name: label.replace(/^NF (Unisex|Womens|Mens|Kids) /, '') };
  }
  return { group: 'Other', name: label };
}

function imageCodeOf(row) {
  const m = /\/([A-Z0-9]+-HERO)/i.exec(row.lotLogoFullbleedDesktop || '');
  if (m) return m[1];
  return `${(row.crossPlantConfigurableMaterial || '').slice(0, 11)}-HERO`;
}

/** Groups raw ATP rows into models (8-char article code) -> colors -> sizes. */
function buildCatalog(rows) {
  const models = new Map();
  for (const row of rows) {
    const cross = row.crossPlantConfigurableMaterial || row.materialNumberId || '';
    const modelCode = cross.slice(0, 8);
    if (!modelCode) continue;

    let model = models.get(modelCode);
    if (!model) {
      const cat = categoryInfo(row.hs2ProductCategory);
      model = {
        code: modelCode,
        name: row.style || modelCode,
        gender: stripCode(row.fashionInformationField1),
        categoryGroup: cat.group,
        category: cat.name,
        collection: stripCode(row.brandTerritory) || null,
        season: seasonLabel(row.lastSeasonYearSeasonEMEA),
        seasonRank: seasonRank(seasonLabel(row.lastSeasonYearSeasonEMEA)),
        total: 0,
        colors: new Map()
      };
      models.set(modelCode, model);
    }

    const colorKey = cross;
    let color = model.colors.get(colorKey);
    if (!color) {
      color = {
        code: colorKey,
        label: stripCode(row.colorNrfColorCode),
        family: colorFamily(stripCode(row.colorNrfColorCode)),
        imageCode: imageCodeOf(row),
        total: 0,
        sizes: new Map()
      };
      model.colors.set(colorKey, color);
    }

    const qty = row.atpCurrentWeek30plus || 0;
    const size = row.characteristicValueForMainSizesOfVariantsId;
    const existing = color.sizes.get(size);
    if (existing) {
      existing.quantity += qty;
    } else {
      color.sizes.set(size, {
        size,
        quantity: qty,
        materialNumberId: row.materialNumberId,
        materialNumberText: row.materialNumberText
      });
    }
    color.total += qty;
    model.total += qty;
  }

  return [...models.values()].map((m) => ({
    ...m,
    colors: [...m.colors.values()].map((c) => ({
      ...c,
      sizes: [...c.sizes.values()].sort((a, b) => compareSizes(a.size, b.size))
    }))
  }));
}

const FACETS = {
  gender: (m) => m.gender,
  categoryGroup: (m) => m.categoryGroup,
  category: (m) => m.category,
  collection: (m) => m.collection,
  season: (m) => m.season
};

const SORTS = {
  // newest season first, then the best-stocked articles within a season
  season: (a, b) => b.seasonRank - a.seasonRank || b.total - a.total || a.name.localeCompare(b.name),
  name: (a, b) => a.name.localeCompare(b.name),
  stock: (a, b) => b.total - a.total || a.name.localeCompare(b.name),
  colors: (a, b) => b.colors.length - a.colors.length || a.name.localeCompare(b.name)
};

/**
 * How a search text matches a model. Name or model code -> the whole model.
 * A color code/name or a material number -> only those colors (and sizes), so the
 * card shows the stock of what was actually typed. Returns null when nothing matches.
 */
function searchHit(model, q) {
  if (!q) return { colors: model.colors, sizes: [] };
  if (model.name.toLowerCase().includes(q) || model.code.toLowerCase().includes(q)) {
    return { colors: model.colors, sizes: [] };
  }
  const colors = [];
  const sizes = [];
  for (const c of model.colors) {
    const colorHit = c.code.toLowerCase().includes(q) || c.label.toLowerCase().includes(q);
    const sizeHits = c.sizes.filter((sz) => sz.materialNumberId.toLowerCase().includes(q));
    if (!colorHit && !sizeHits.length) continue;
    colors.push(c);
    // a specific size only matters when the text is more precise than the color
    if (!colorHit) sizeHits.forEach((sz) => sizes.push({ ...sz, colorCode: c.code }));
  }
  return colors.length ? { colors, sizes } : null;
}

const asList = (v) => (v === undefined || v === '' ? [] : [].concat(v).map(String));

/**
 * Filters, sorts and paginates a catalog. Facet counts reflect all other active
 * filters, so the UI can show how many results each option would give.
 * Color and size filters (and searches by color / material number) narrow what a
 * card shows, so its stock figure is the stock of what was asked for.
 */
function queryCatalog(catalog, params = {}) {
  const q = String(params.q || '').trim().toLowerCase();
  const filters = {};
  for (const key of Object.keys(FACETS)) filters[key] = asList(params[key]);
  const colorFilter = asList(params.color);
  const sizeFilter = asList(params.size);

  /** The part of a model that satisfies every filter except `skip`, or null. */
  const view = (m, skip) => {
    for (const key of Object.keys(FACETS)) {
      if (key === skip || filters[key].length === 0) continue;
      if (!filters[key].includes(FACETS[key](m))) return null;
    }
    const hit = searchHit(m, q);
    if (!hit) return null;
    let colors = hit.colors;
    if (skip !== 'color' && colorFilter.length) colors = colors.filter((c) => colorFilter.includes(c.family));
    const sized = skip !== 'size' && sizeFilter.length > 0;
    if (sized) colors = colors.filter((c) => c.sizes.some((sz) => sizeFilter.includes(sz.size)));
    if (!colors.length) return null;
    const codes = new Set(colors.map((c) => c.code));
    return { hit, colors, sized, sizes: hit.sizes.filter((sz) => codes.has(sz.colorCode)) };
  };

  const facets = {};
  for (const key of [...Object.keys(FACETS), 'color', 'size']) {
    const counts = new Map();
    for (const m of catalog) {
      const v = view(m, key);
      if (!v) continue;
      const values = key === 'size' ? new Set(v.colors.flatMap((c) => c.sizes.map((sz) => sz.size)))
        : key === 'color' ? new Set(v.colors.map((c) => c.family))
        : [FACETS[key](m)];
      for (const value of values) if (value) counts.set(value, (counts.get(value) || 0) + 1);
    }
    const entries = [...counts].map(([value, count]) => ({ value, count }));
    const order = {
      size: (a, b) => compareSizes(a.value, b.value),
      season: (a, b) => seasonRank(b.value) - seasonRank(a.value) || a.value.localeCompare(b.value) // newest first
    }[key] || ((a, b) => a.value.localeCompare(b.value));
    entries.sort(order);
    facets[key] = entries;
  }

  // What each card will show (filtered stock), computed once so sorting uses the same figures.
  const rows = [];
  for (const m of catalog) {
    const v = view(m);
    if (!v) continue;
    const qty = (c) => (v.sized ? c.sizes.filter((sz) => sizeFilter.includes(sz.size)).reduce((n, sz) => n + sz.quantity, 0) : c.total);
    const colors = v.colors.map((c) => ({ code: c.code, label: c.label, imageCode: c.imageCode, total: qty(c) }));
    const total = v.sizes.length ? v.sizes.reduce((n, sz) => n + sz.quantity, 0) : colors.reduce((n, c) => n + c.total, 0);
    rows.push({ m, v, colors, total, sortKey: { name: m.name, seasonRank: m.seasonRank, total, colors } });
  }
  const compare = SORTS[params.sort] || SORTS.name;
  rows.sort((a, b) => compare(a.sortKey, b.sortKey));
  const results = rows;

  const page = Math.max(1, parseInt(params.page, 10) || 1);
  const items = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(({ m, v, colors, total }) => ({
    code: m.code, name: m.name, gender: m.gender, categoryGroup: m.categoryGroup,
    category: m.category, collection: m.collection, season: m.season,
    // exact material-number match -> that size's stock; otherwise the stock of what is shown
    total,
    narrowed: v.colors.length !== m.colors.length || v.sized,
    matchedSizes: v.sizes,
    colors
  }));

  // the four most recent seasons present in the file ("saisons actuelles")
  const currentSeasons = [...new Set(catalog.map((m) => m.season).filter(Boolean))]
    .sort((a, b) => seasonRank(b) - seasonRank(a)).slice(0, 4);

  return { items, total: results.length, page, pageSize: PAGE_SIZE, facets, currentSeasons };
}

// --- loading with an in-memory cache, cleared after every import -------------
let cache = null;
let loading = null;

async function getCatalog() {
  if (cache) return cache;
  if (!loading) {
    loading = Atp.find().lean()
      .then((rows) => (cache = buildCatalog(rows)))
      .finally(() => { loading = null; });
  }
  return loading;
}

function invalidateCatalog() {
  cache = null;
}

async function getModel(code) {
  const catalog = await getCatalog();
  return catalog.find((m) => m.code === String(code).toUpperCase()) || null;
}

module.exports = { colorFamily, seasonRank, buildCatalog, queryCatalog, getCatalog, getModel, invalidateCatalog, compareSizes, seasonLabel, PAGE_SIZE };
