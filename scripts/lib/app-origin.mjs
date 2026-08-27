import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const CONFIG_PATH = resolve(
	dirname(fileURLToPath(import.meta.url)),
	'../../src/config/app.ts',
);

/**
 * Adres produkcyjny panelu — czytany z SSOT (`src/config/app.ts`), bo skrypty
 * `.mjs` nie importują TypeScriptu. Dzięki temu Supabase Auth i testy E2E nie
 * rozjeżdżają się z konfiguracją aplikacji.
 *
 * @returns {string}
 */
export function getProductionOrigin() {
	const source = readFileSync(CONFIG_PATH, 'utf8');
	const match = source.match(/productionOrigin:\s*'([^']+)'/);
	if (!match) {
		throw new Error('Nie znaleziono productionOrigin w src/config/app.ts');
	}
	return match[1];
}
