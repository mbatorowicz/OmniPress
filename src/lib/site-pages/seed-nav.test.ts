import { describe, expect, it } from 'vitest';
import { collectNavPageSpecs } from './seed-nav';

describe('seed-nav', () => {
	it('zbiera unikalne linki wewnętrzne z menu', () => {
		const specs = collectNavPageSpecs([
			{
				label: 'Gmina',
				children: [
					{ label: 'Plan', href: '/gmina/plan-ogolny' },
					{ label: 'Kontakt', href: '/kontakt' },
				],
			},
			{ label: 'BIP', href: 'https://bip.example.pl/' },
		]);

		expect(specs).toHaveLength(1);
		expect(specs[0]).toMatchObject({
			href: '/gmina/plan-ogolny',
			title: 'Plan',
			path_prefix: 'gmina',
			slug: 'plan-ogolny',
		});
	});
});

describe('seedNavSitePages — kontrakt', () => {
	it('eksportuje funkcję bez publikacji (tylko szkice)', async () => {
		const { seedNavSitePages } = await import('./seed-nav');
		expect(seedNavSitePages.length).toBe(3);
	});
});
