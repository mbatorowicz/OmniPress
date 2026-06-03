import { describe, expect, it } from 'vitest';
import type { Profile } from '../types';
import { collectAllowedSites, resolveSiteIdForNewPost, type AllowedSite } from './site';

const profile = (default_site_id: string | null = null): Profile => ({
	id: 'u1',
	role: 'editor',
	display_name: null,
	default_site_id,
	created_at: '',
	updated_at: '',
});

const site = (id: string, slug: string): AllowedSite => ({
	id,
	name: `Site ${slug}`,
	slug,
});

describe('collectAllowedSites', () => {
	it('łączy user_sites i default_site_id z wiersza', () => {
		const allowed = collectAllowedSites(profile('site-b'), [
			{
				site_id: 'site-a',
				sites: { id: 'site-a', name: 'A', slug: 'a' },
			},
			{
				site_id: 'site-b',
				sites: { id: 'site-b', name: 'B', slug: 'b' },
			},
		]);
		expect(allowed.map((s) => s.slug).sort()).toEqual(['a', 'b']);
	});
});

describe('resolveSiteIdForNewPost', () => {
	const allowed = [site('site-a', 'a'), site('site-b', 'b')];

	it('brak stron → null', () => {
		expect(resolveSiteIdForNewPost(profile(), [])).toBeNull();
	});

	it('honoruje requestedSiteId z listy', () => {
		expect(resolveSiteIdForNewPost(profile('site-b'), allowed, 'site-a')).toBe('site-a');
	});

	it('odrzuca nieautoryzowany site_id', () => {
		expect(resolveSiteIdForNewPost(profile('site-b'), allowed, 'site-x')).toBe('site-b');
	});

	it('fallback na pierwszą stronę', () => {
		expect(resolveSiteIdForNewPost(profile(null), allowed)).toBe('site-a');
	});
});
