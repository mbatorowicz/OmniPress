import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createSupabaseFake } from '@/lib/testing/supabase-fake';
import { STATIC_ROUTE_OPTIONS } from '@/lib/admin/link-options';
import { buildKnownNavPaths, DEFAULT_STATIC_ROUTES } from './nav-known-paths';
import { validateNavigationLinks } from './validate-nav';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '../../..');

function callerSource(relPath: string): string {
	return readFileSync(join(repoRoot, relPath), 'utf8');
}

describe('DEFAULT_STATIC_ROUTES', () => {
	it('zgadza się z opcjami selectu edytora', () => {
		expect([...DEFAULT_STATIC_ROUTES]).toEqual(STATIC_ROUTE_OPTIONS.map((o) => o.path));
	});
});

describe('buildKnownNavPaths', () => {
	it('składa tylko trasy statyczne, opublikowane strony i kategorie', async () => {
		const fake = createSupabaseFake((op) => {
			if (op.table !== 'site_pages') return undefined;
			return {
				data: [
					{ path_prefix: 'gmina', slug: 'wojt', status: 'published' },
					{ path_prefix: 'gmina', slug: 'gops', status: 'draft' },
				],
			};
		});

		const known = await buildKnownNavPaths(fake.client, 'site-1', [
			'aktualnosci',
			'ochrona-ludnosci',
			'  ',
		]);

		expect(known.has('/')).toBe(true);
		expect(known.has('/kontakt')).toBe(true);
		expect(known.has('/gmina/wojt')).toBe(true);
		expect(known.has('/aktualnosci')).toBe(true);
		expect(known.has('/ochrona-ludnosci')).toBe(true);
		expect(known.has('/gmina/gops')).toBe(false);
	});

	it('P0-9: href z menu nie wchodzi do known — nieopublikowana strona jest dead_link', async () => {
		const fake = createSupabaseFake((op) => {
			if (op.table !== 'site_pages') return undefined;
			return {
				data: [
					{ path_prefix: 'gmina', slug: 'wojt', status: 'published' },
					{ path_prefix: 'gmina', slug: 'gops', status: 'published' },
				],
			};
		});

		const known = await buildKnownNavPaths(fake.client, 'site-1', [
			'aktualnosci',
			'ochrona-ludnosci',
		]);
		const issues = validateNavigationLinks(
			[
				{ label: 'Wójt', href: '/gmina/wojt' },
				{ label: 'GOPS', href: '/gmina/gops' },
				{ label: 'Brak', href: '/gmina/brak-strony' },
				{ label: 'Wpis', href: '/aktualnosci/cokolwiek' },
			],
			known,
		);

		expect(known.has('/gmina/gops')).toBe(true);
		expect(issues).toEqual([
			expect.objectContaining({ href: '/gmina/brak-strony', reason: 'dead_link' }),
		]);
	});
});

describe('P0-9 callers', () => {
	it('publikacja i kontekst edytora nie dokładają href z menu do known paths', () => {
		const files = [
			'src/pages/api/admin/sites/[id]/layout/publish.ts',
			'src/pages/api/admin/sites/[id]/layout/publish-all.ts',
			'src/lib/admin/layout-editor-context.ts',
		];
		for (const file of files) {
			expect(callerSource(file), file).not.toMatch(/collectNavInternalPageOptions/);
		}
	});
});
