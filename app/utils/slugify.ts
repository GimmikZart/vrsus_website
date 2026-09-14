/**
 * Genera uno slug URL-safe da un titolo.
 *
 * La normalizzazione NFD separa i segni diacritici dalle lettere, cosi la
 * rimozione dell'intervallo dei combining marks trasforma "Città" in "citta"
 * invece di scartare del tutto la lettera accentata.
 */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
