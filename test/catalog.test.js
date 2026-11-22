const test = require('node:test');
const assert = require('node:assert');
const { buildCatalog, queryCatalog, compareSizes, seasonLabel, seasonRank, colorFamily } = require('../services/catalogService');

const row = (over) => ({
  crossPlantConfigurableMaterial: 'NF0A8D1TJK31',
  style: 'M CLASSIC DWN HD JKT',
  materialNumberId: 'NF0A8D1TJK31003',
  materialNumberText: 'M CLASSIC DWN HD JKT TNF BLACK, X Large',
  colorNrfColorCode: '001 - BLACK',
  characteristicValueForMainSizesOfVariantsId: 'XL',
  fashionInformationField1: 'M - Mens',
  hs2ProductCategory: '115 - APP_Outerwear',
  brandTerritory: '317 - Mountain Sports',
  lastSeasonYearSeasonEMEA: 'F02026',
  lotLogoFullbleedDesktop: 'https://images.thenorthface.com/is/image/TheNorthFaceEU/NF0A8D1TJK3-HERO?$hero-fullbleed-desktop$',
  atpCurrentWeek30plus: 4,
  ...over
});

const rows = [
  row({}),
  row({ characteristicValueForMainSizesOfVariantsId: 'M', materialNumberId: 'NF0A8D1TJK31002', atpCurrentWeek30plus: 6 }),
  row({ characteristicValueForMainSizesOfVariantsId: 'M', materialNumberId: 'NF0A8D1TJK31002', atpCurrentWeek30plus: 1 }), // other plant, same item
  row({ crossPlantConfigurableMaterial: 'NF0A8D1T0QU1', colorNrfColorCode: '201 - DARK BROWN', materialNumberId: 'NF0A8D1T0QU1003' }),
  row({
    crossPlantConfigurableMaterial: 'NF0A3FJWJK31', style: 'SALTY LINED BEANIE', fashionInformationField1: 'U - Unisex',
    hs2ProductCategory: '105 - ACC_Headwear', brandTerritory: '', lastSeasonYearSeasonEMEA: 'S02025',
    characteristicValueForMainSizesOfVariantsId: 'OS', materialNumberId: 'NF0A3FJWJK31001', atpCurrentWeek30plus: 31
  })
];

test('buildCatalog groups rows by model, color and size, summing duplicates', () => {
  const catalog = buildCatalog(rows);
  assert.strictEqual(catalog.length, 2);
  const jacket = catalog.find((m) => m.code === 'NF0A8D1T');
  assert.strictEqual(jacket.colors.length, 2);
  assert.strictEqual(jacket.total, 4 + 6 + 1 + 4);
  const black = jacket.colors.find((c) => c.code === 'NF0A8D1TJK31');
  assert.deepStrictEqual(black.sizes.map((s) => [s.size, s.quantity]), [['M', 7], ['XL', 4]]);
  assert.strictEqual(black.imageCode, 'NF0A8D1TJK3-HERO');
  assert.strictEqual(black.nrf, '001 - BLACK'); // the full text is kept for copying
  assert.strictEqual(jacket.categoryGroup, 'Apparel');
  assert.strictEqual(jacket.category, 'Outerwear');
  assert.strictEqual(jacket.gender, 'Mens');
  assert.strictEqual(jacket.season, 'FW26');
});

test('missing collection becomes null and is left out of facets', () => {
  const catalog = buildCatalog(rows);
  const res = queryCatalog(catalog, {});
  assert.deepStrictEqual(res.facets.collection, [{ value: 'Mountain Sports', count: 1 }]);
});

test('queryCatalog filters, searches and sorts', () => {
  const catalog = buildCatalog(rows);
  assert.strictEqual(queryCatalog(catalog, { gender: 'Unisex' }).total, 1);
  assert.strictEqual(queryCatalog(catalog, { q: 'beanie' }).items[0].code, 'NF0A3FJW');
  assert.strictEqual(queryCatalog(catalog, { q: 'dark brown' }).items[0].code, 'NF0A8D1T');
  assert.strictEqual(queryCatalog(catalog, { size: 'OS' }).total, 1);
  assert.strictEqual(queryCatalog(catalog, { sort: 'stock' }).items[0].code, 'NF0A3FJW');
  assert.strictEqual(queryCatalog(catalog, { sort: 'name' }).items[0].name, 'M CLASSIC DWN HD JKT');
  assert.strictEqual(queryCatalog(catalog, { q: 'nothing like this' }).total, 0);
});

test('search by color code narrows to that color; by material number to that size', () => {
  const catalog = buildCatalog(rows);
  // model code / name: whole model
  const whole = queryCatalog(catalog, { q: 'NF0A8D1T' }).items[0];
  assert.strictEqual(whole.colors.length, 2);
  assert.strictEqual(whole.total, 15);
  assert.strictEqual(whole.narrowed, false);
  // color code (12 chars) and the 11-char image code: just that color
  for (const q of ['NF0A8D1TJK31', 'NF0A8D1TJK3']) {
    const hit = queryCatalog(catalog, { q }).items[0];
    assert.deepStrictEqual(hit.colors.map((c) => c.code), ['NF0A8D1TJK31']);
    assert.strictEqual(hit.total, 11);
    assert.strictEqual(hit.narrowed, true);
    assert.deepStrictEqual(hit.matchedSizes, []);
  }
  // full material number: that size, with its quantity
  const exact = queryCatalog(catalog, { q: 'nf0a8d1tjk31002' });
  assert.strictEqual(exact.total, 1);
  assert.deepStrictEqual(exact.items[0].matchedSizes.map((s) => [s.materialNumberId, s.size, s.quantity, s.colorCode]),
    [['NF0A8D1TJK31002', 'M', 7, 'NF0A8D1TJK31']]);
  assert.strictEqual(exact.items[0].total, 7); // that size only, not the whole color (11)
  // search text that matches nothing
  assert.strictEqual(queryCatalog(catalog, { q: 'NF0A8D1TJK31999' }).total, 0);
});

test('facet counts respect the other active filters', () => {
  const catalog = buildCatalog(rows);
  const res = queryCatalog(catalog, { gender: 'Mens' });
  assert.deepStrictEqual(res.facets.categoryGroup, [{ value: 'Apparel', count: 1 }]);
  // the gender facet itself ignores the gender filter, so users can switch
  assert.strictEqual(res.facets.gender.length, 2);
});

test('pagination', () => {
  const many = Array.from({ length: 100 }, (_, i) => row({ crossPlantConfigurableMaterial: `NF0A${String(i).padStart(4, '0')}JK31`, style: `S${i}` }));
  const res = queryCatalog(buildCatalog(many), { page: 3 });
  assert.strictEqual(res.total, 100);
  assert.strictEqual(res.items.length, 100 - 96);
});

test('category groups cover equipment, bags and unknown prefixes', () => {
  const cat = (c) => buildCatalog([row({ hs2ProductCategory: c })])[0];
  assert.deepStrictEqual([cat('120 - EQU_Tents').categoryGroup, cat('120 - EQU_Tents').category], ['Equipment', 'Tents']);
  assert.deepStrictEqual([cat('50T - NF Unisex Bags and Backpacks').categoryGroup, cat('50T - NF Unisex Bags and Backpacks').category], ['Bags', 'Bags and Backpacks']);
  assert.strictEqual(cat('130 - OTH_ Warranty').category, 'Warranty');
  assert.strictEqual(cat('50C - NF Unisex Point of Sale').categoryGroup, 'Other');
});

test('size and season helpers', () => {
  assert.deepStrictEqual(['XL', 'S', '095', 'OS', 'M', '090'].sort(compareSizes), ['S', 'M', 'XL', 'OS', '090', '095']);
  assert.strictEqual(seasonLabel('S02027'), 'SS27');
});

test('seasons sort newest first: FW27, SS27, FW26, SS26 ...', () => {
  const mk = (cross, season) => row({ crossPlantConfigurableMaterial: cross, lastSeasonYearSeasonEMEA: season, style: `S ${cross}` });
  const catalog = buildCatalog([
    mk('NF0A0001AAA1', 'S02026'), mk('NF0A0002AAA1', 'F02027'), mk('NF0A0003AAA1', 'F02026'),
    mk('NF0A0004AAA1', 'S02027'), mk('NF0A0005AAA1', 'F02025')
  ]);
  const res = queryCatalog(catalog, { sort: 'season' });
  assert.deepStrictEqual(res.items.map((i) => i.season), ['FW27', 'SS27', 'FW26', 'SS26', 'FW25']);
  assert.deepStrictEqual(res.facets.season.map((f) => f.value), ['FW27', 'SS27', 'FW26', 'SS26', 'FW25']);
  assert.ok(seasonRank('FW27') > seasonRank('SS27') && seasonRank('SS27') > seasonRank('FW26'));
});

test('colors are grouped into families', () => {
  assert.deepStrictEqual(
    ['BLACK', 'MEDIUM BROWN', 'DARK OLIVE', 'NAVY', 'RUST/COPPER', 'TURQUOISE/AQUA', 'BURGUNDY', 'LIGHT TAUPE', 'NO COLOR', 'BRIGHT PINK'].map(colorFamily),
    ['BLACK', 'BROWN', 'GREEN', 'BLUE', 'ORANGE', 'TEAL', 'RED', 'BEIGE', 'OTHER', 'PINK']
  );
});

test('color filter narrows the card to that family and its stock', () => {
  const catalog = buildCatalog(rows);
  const res = queryCatalog(catalog, { color: 'BROWN' });
  assert.strictEqual(res.total, 1);
  assert.deepStrictEqual(res.items[0].colors.map((c) => [c.label, c.total]), [['DARK BROWN', 4]]);
  assert.strictEqual(res.items[0].total, 4);
  assert.strictEqual(res.items[0].narrowed, true);
  // facet counts: BLACK and BROWN both exist for the jacket, the beanie is black too
  const all = queryCatalog(catalog, {});
  assert.deepStrictEqual(all.facets.color, [{ value: 'BLACK', count: 2 }, { value: 'BROWN', count: 1 }]);
});

test('size filter keeps only models having the size and counts just those sizes', () => {
  const catalog = buildCatalog(rows);
  const res = queryCatalog(catalog, { size: ['M', 'XL'] });
  assert.strictEqual(res.total, 1);
  assert.strictEqual(res.items[0].total, 7 + 4 + 4); // black M 7 + black XL 4 + brown XL 4
  assert.deepStrictEqual(res.items[0].colors.map((c) => c.total), [11, 4]);
});

test('size and color filters combine; facets reflect the other filters', () => {
  const catalog = buildCatalog(rows);
  const res = queryCatalog(catalog, { color: 'BROWN', size: 'M' });
  assert.strictEqual(res.total, 0); // the brown one only has XL
  const xl = queryCatalog(catalog, { color: 'BROWN' });
  assert.deepStrictEqual(xl.facets.size.map((f) => f.value), ['XL']);
});

test('currentSeasons are the four most recent seasons in the file', () => {
  const mk = (cross, season) => row({ crossPlantConfigurableMaterial: cross, lastSeasonYearSeasonEMEA: season });
  const catalog = buildCatalog(['F02027', 'S02027', 'F02026', 'S02026', 'F02025', 'S02025'].map((x, i) => mk(`NF0A000${i}AAA1`, x)));
  assert.deepStrictEqual(queryCatalog(catalog, {}).currentSeasons, ['FW27', 'SS27', 'FW26', 'SS26']);
});

test('sorting by stock uses the filtered figures the cards show', () => {
  // beanie: 31 in total; jacket: black 11 + brown 4. Filtering to BROWN leaves the jacket with 4.
  const catalog = buildCatalog(rows);
  assert.deepStrictEqual(queryCatalog(catalog, { sort: 'stock' }).items.map((i) => i.total), [31, 15]);
  // size filter XL: jacket black XL 4 + brown XL 4 = 8; beanie has no XL
  const xl = queryCatalog(catalog, { sort: 'stock', size: 'XL' });
  assert.deepStrictEqual(xl.items.map((i) => [i.code, i.total]), [['NF0A8D1T', 8]]);
});

test('default season sort puts the best-stocked article first within a season', () => {
  const mk = (cross, season, qty, style) => row({ crossPlantConfigurableMaterial: cross, lastSeasonYearSeasonEMEA: season, atpCurrentWeek30plus: qty, style });
  const catalog = buildCatalog([
    mk('NF0A0001AAA1', 'F02027', 5, 'Zed small'), mk('NF0A0002AAA1', 'F02027', 50, 'Beta big'),
    mk('NF0A0003AAA1', 'F02026', 999, 'Old season huge'), mk('NF0A0004AAA1', 'F02027', 50, 'Alpha big')
  ]);
  assert.deepStrictEqual(queryCatalog(catalog, { sort: 'season' }).items.map((i) => i.name),
    ['Alpha big', 'Beta big', 'Zed small', 'Old season huge']); // ties broken by name
});
