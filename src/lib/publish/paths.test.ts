import { describe, expect, it } from 'vitest';
import { joinContentPath, resolvePostSlug, slugFileCandidates } from './paths';
import type { PostForPublish } from './types';

const post = (overrides: Partial<PostForPublish> = {}): PostForPublish => ({
	id: '00000000-0000-0000-0000-000000000001',
	site_id: 's1',
	title: 'Święto Gminy',
	slug: null,
	content_md: '',
	status: 'publishing',
	...overrides,
});

describe('resolvePostSlug', () => {
	it('używa slug z bazy', () => {
		expect(resolvePostSlug(post({ slug: 'swieto-gminy' }))).toBe('swieto-gminy');
	});

	it('generuje z tytułu', () => {
		expect(resolvePostSlug(post({ title: 'Nowa droga' }))).toBe('nowa-droga');
	});
});

describe('joinContentPath', () => {
	it('skleja ścieżki contentu', () => {
		expect(joinContentPath('src/content/aktualnosci', 'foo.md')).toBe(
			'src/content/aktualnosci/foo.md',
		);
	});
});

describe('slugFileCandidates', () => {
	it('zwraca kolejne nazwy plików (flat)', () => {
		expect(slugFileCandidates('aktualnosc', 'flat').slice(0, 3)).toEqual([
			'aktualnosc.md',
			'aktualnosc-2.md',
			'aktualnosc-3.md',
		]);
	});

	it('zwraca ścieżki folder/index.md', () => {
		expect(slugFileCandidates('informacja', 'folder').slice(0, 2)).toEqual([
			'informacja/index.md',
			'informacja-2/index.md',
		]);
	});
});
