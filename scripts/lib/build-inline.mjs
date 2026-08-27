/**
 * Reguła inline'owania assetów dla buildu (astro.config.mjs → vite.build.assetsInlineLimit).
 *
 * CSP panelu (`src/lib/security/headers.ts`) dopuszcza `script-src 'self'` + nonce.
 * Astro wstawia małe bundlowane `<script>` wprost do HTML (`inlinedScripts` w manifeście),
 * a takiemu tagowi nie da się dodać nonce — przeglądarka go blokuje i interakcje w panelu
 * przestają działać. Dlatego skrypty zawsze trafiają do plików `_astro/*.js`.
 *
 * @param {string} filePath
 * @returns {false | undefined} `false` = nigdy inline; `undefined` = domyślny próg Vite
 */
export function assetsInlineLimit(filePath) {
	return filePath.endsWith('.js') ? false : undefined;
}
