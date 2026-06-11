/**
 * Static i18n parity test.
 *
 * Ensures every translation key present in `pt` exists in all other supported
 * languages (`es`, `fr`, `it`, `en`). Without this guard, missing keys silently
 * fall back to either the key path or a hardcoded fallback in the JSX, which
 * is invisible to reviewers.
 *
 * This is a plain Jest test — no React or DOM needed. Run with:
 *   yarn test --runTestsByPath src/i18n/__tests__/i18n_parity.test.js
 *
 * The test imports the translations module directly so any future structural
 * change to the file is exercised at the same time.
 */

import { translations } from '../translations';

function collectLeafKeys(obj, prefix = '') {
  const out = [];
  for (const [k, v] of Object.entries(obj || {})) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      out.push(...collectLeafKeys(v, path));
    } else {
      out.push(path);
    }
  }
  return out;
}

describe('i18n parity', () => {
  const supportedLangs = ['pt', 'es', 'fr', 'it', 'en'];

  test('translations object exposes all 5 supported languages', () => {
    for (const lang of supportedLangs) {
      expect(translations[lang]).toBeDefined();
    }
  });

  const ptKeys = new Set(collectLeafKeys(translations.pt));

  test.each(supportedLangs.filter((l) => l !== 'pt'))(
    '%s has no missing keys vs pt',
    (lang) => {
      const langKeys = new Set(collectLeafKeys(translations[lang]));
      const missing = [...ptKeys].filter((k) => !langKeys.has(k)).sort();
      expect(missing).toEqual([]);
    }
  );

  test.each(supportedLangs.filter((l) => l !== 'pt'))(
    '%s has no extra keys vs pt (avoids dead translations)',
    (lang) => {
      const langKeys = new Set(collectLeafKeys(translations[lang]));
      const extra = [...langKeys].filter((k) => !ptKeys.has(k)).sort();
      expect(extra).toEqual([]);
    }
  );
});
