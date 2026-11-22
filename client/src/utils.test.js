import { formatSize, normalizeQuery, imageUrl, seasonName } from './utils.js';

describe('utils', () => {
  it('formats numeric footwear sizes as US sizes and leaves others alone', () => {
    expect(formatSize('090')).toBe('US 9.0');
    expect(formatSize('055')).toBe('US 5.5');
    expect(formatSize('XL')).toBe('XL');
    expect(formatSize('OS')).toBe('OS');
  });

  it('extracts the article code from a pasted TNF URL', () => {
    expect(normalizeQuery('https://www.thenorthface.ch/fr-ch/p/x-211701/veste-NF0A87ZK?color=5NO')).toBe('NF0A87ZK');
    expect(normalizeQuery('https://x.ch/p/NF00CHA1')).toBe('NF00CHA1');
  });

  it('leaves normal search text untouched', () => {
    expect(normalizeQuery('beanie')).toBe('beanie');
    expect(normalizeQuery('https://example.com/nothing')).toBe('https://example.com/nothing');
  });

  it('builds the image URL from the code and width', () => {
    expect(imageUrl('NF0A8C9ESE7-HERO', 300)).toBe(
      'https://assets.thenorthface.eu/images/t_img/c_fill,f_auto,w_300/NF0A8C9ESE7-HERO/x.jpg'
    );
  });
});
