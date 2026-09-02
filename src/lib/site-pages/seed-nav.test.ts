import { beforeEach, describe, expect, it, vi } from 'vitest';
import { adminSitePages } from '@/i18n';
import { createSupabaseFake, hasEq, stepArgs, updatePayloads } from '@/lib/testing/supabase-fake';
import { collectNavPageSpecs } from './seed-nav';

const store = vi.hoisted(() => ({
	loadSiteAstroLayout: vi.fn(),
}));

vi.mock('@/lib/astro-layout/store', () => ({
	loadSiteAstroLayout: store.loadSiteAstroLayout,
}));

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

describe('seedNavSitePages', () => {
	beforeEach(() => {
		store.loadSiteAstroLayout.mockReset();
		store.loadSiteAstroLayout.mockResolvedValue({
			navigation: [{ label: 'Plan', href: '/gmina/plan-ogolny' }],
		});
	});

	it('tworzy tylko szkic z placeholdera, bez statusu published', async () => {
		const pages = new Map<string, Record<string, unknown>>();
		const fake = createSupabaseFake((op) => {
			if (op.table !== 'site_pages') return { data: null };
			if (op.steps.some((step) => step.method === 'insert')) {
				const payload = stepArgs(op, 'insert')?.[0] as Record<string, unknown>;
				const row = { id: 'page-new', status: 'draft', external_id: null, ...payload };
				pages.set(row.id as string, row);
				return { data: row };
			}
			if (op.steps.some((step) => step.method === 'update')) {
				const id = op.steps.find((step) => step.method === 'eq' && step.args[0] === 'id')
					?.args[1] as string;
				const patch = stepArgs(op, 'update')?.[0] as Record<string, unknown>;
				const next = { ...pages.get(id), ...patch };
				pages.set(id, next);
				return { data: next };
			}
			if (op.steps.some((step) => step.method === 'maybeSingle')) {
				const id = op.steps.find((step) => step.method === 'eq' && step.args[0] === 'id')
					?.args[1] as string;
				return { data: pages.get(id) ?? null };
			}
			return { data: [...pages.values()] };
		});

		const { seedNavSitePages } = await import('./seed-nav');
		const result = await seedNavSitePages(fake.client, 'site-1', 'user-1');

		expect(result).toEqual({ created: 1, skipped: 0, total: 1 });
		const updates = updatePayloads(fake, 'site_pages');
		expect(updates).toHaveLength(1);
		expect(updates[0]).toMatchObject({
			title: 'Plan',
			slug: 'plan-ogolny',
			path_prefix: 'gmina',
			content_md: adminSitePages.placeholderContent,
		});
		expect(updates[0]).not.toHaveProperty('status', 'published');
		expect(updates[0]).not.toHaveProperty('external_id');
		expect(fake.calls.every((op) => op.table === 'site_pages')).toBe(true);
	});

	it('pomija href, który już jest w Omni', async () => {
		const fake = createSupabaseFake((op) => {
			if (op.table === 'site_pages' && !op.steps.some((step) => step.method === 'insert')) {
				return {
					data: [
						{
							id: 'existing',
							path_prefix: 'gmina',
							slug: 'plan-ogolny',
							title: 'Plan',
							content_md: 'Już jest',
							status: 'published',
						},
					],
				};
			}
			return { data: null, error: { message: 'nie powinno tworzyć strony' } };
		});

		const { seedNavSitePages } = await import('./seed-nav');
		const result = await seedNavSitePages(fake.client, 'site-1', 'user-1');

		expect(result).toEqual({ created: 0, skipped: 1, total: 1 });
		expect(fake.calls.some((op) => op.steps.some((step) => step.method === 'insert'))).toBe(false);
		expect(hasEq(fake.calls[0]!, 'site_id', 'site-1')).toBe(true);
	});
});
