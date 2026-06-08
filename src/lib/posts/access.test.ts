import { describe, expect, it } from 'vitest';
import { canEditPost, canSubmitPost, canViewPostAssets, slugFromTitle, type PostRow } from './access';

const draftPost = (overrides: Partial<PostRow> = {}): PostRow => ({
	id: '1',
	author_id: 'author-1',
	site_id: 'site-1',
	title: 'Tytuł',
	content_md: '',
	slug: null,
	status: 'draft',
	rejection_note: null,
	category_slug: null,
	category_name: null,
	...overrides,
});

describe('slugFromTitle', () => {
	it('normalizuje polskie znaki', () => {
		expect(slugFromTitle('Święto Narodowe')).toBe('swieto-narodowe');
	});

	it('obcina do 80 znaków', () => {
		const long = 'a'.repeat(100);
		expect(slugFromTitle(long).length).toBe(80);
	});
});

describe('canEditPost', () => {
	it('autor edytuje draft i rejected', () => {
		expect(canEditPost(draftPost(), 'author-1', 'editor')).toBe(true);
		expect(canEditPost(draftPost({ status: 'rejected' }), 'author-1', 'editor')).toBe(true);
	});

	it('autor nie edytuje pending i publishing', () => {
		expect(canEditPost(draftPost({ status: 'pending' }), 'author-1', 'editor')).toBe(false);
		expect(canEditPost(draftPost({ status: 'publishing' }), 'author-1', 'editor')).toBe(false);
	});

	it('admin edytuje tylko draft/rejected', () => {
		expect(canEditPost(draftPost(), 'other', 'admin')).toBe(true);
		expect(canEditPost(draftPost({ status: 'pending' }), 'other', 'admin')).toBe(false);
	});
});

describe('canViewPostAssets', () => {
	it('admin widzi załączniki każdego wpisu', () => {
		expect(canViewPostAssets(draftPost({ status: 'pending' }), 'other', 'admin')).toBe(true);
	});

	it('redaktor widzi tylko własne wpisy', () => {
		expect(canViewPostAssets(draftPost(), 'author-1', 'editor')).toBe(true);
		expect(canViewPostAssets(draftPost(), 'other', 'editor')).toBe(false);
	});
});

describe('canSubmitPost', () => {
	it('tylko autor draft', () => {
		expect(canSubmitPost(draftPost(), 'author-1')).toBe(true);
		expect(canSubmitPost(draftPost({ status: 'pending' }), 'author-1')).toBe(false);
		expect(canSubmitPost(draftPost(), 'other')).toBe(false);
	});
});
