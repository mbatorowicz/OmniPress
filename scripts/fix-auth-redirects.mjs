/**
 * Ustawia Site URL i redirect URLs w Supabase Auth (naprawia localhost:3000).
 * Wymaga: npx supabase login (raz), potem node scripts/fix-auth-redirects.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const result = spawnSync(
	'npx',
	['supabase', 'config', 'push', '--project-ref', 'tseticasatzviqhthwbr', '--yes'],
	{ cwd: root, stdio: 'inherit', shell: true },
);

if (result.status !== 0) {
	console.error(
		'\nJeśli brak logowania: npx supabase login\n' +
			'Ręcznie w Supabase → Authentication → URL Configuration:\n' +
			'  Site URL: https://omni-press.vercel.app\n' +
			'  Redirect URLs: https://omni-press.vercel.app/**',
	);
	process.exit(result.status ?? 1);
}

console.log('\n✓ Auth URLs zaktualizowane w Supabase');
