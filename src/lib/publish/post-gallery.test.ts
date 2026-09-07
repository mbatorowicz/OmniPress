import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	buildPublishedBodyMd,
	galleryUrlsFromAssets,
	prepareAstroPostFromGallery,
} from './post-gallery';

const POST_ID = '11111111-2222-3333-4444-555555555555';
const legacyUrl = (name: string) =>
	`https://test.supabase.co/storage/v1/object/public/post-assets/${POST_ID}/${name}`;

beforeEach(() => {
	vi.stubEnv('PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
});

describe('buildPublishedBodyMd', () => {
	const pdf = {
		id: 'asset-1',
		storage_path: `${POST_ID}/abc.pdf`,
		filename: 'raport.pdf',
		mime_type: 'application/pdf',
	};

	it('linkuje załącznik do pliku w repo Astro', () => {
		const out = buildPublishedBodyMd('Tekst.', [pdf], new Map([[legacyUrl('abc.pdf'), './abc.pdf']]));
		expect(out).toContain('[📄 raport.pdf](./abc.pdf)');
	});

	it('w podglądzie (bez mapy publikacji) linkuje do proxy, nie do publicznego Storage', () => {
		const out = buildPublishedBodyMd('Tekst.', [pdf], new Map());
		expect(out).toContain(`(/api/posts/${POST_ID}/assets/asset-1/file)`);
		expect(out).not.toContain('object/public');
	});
});

describe('galleryUrlsFromAssets', () => {
	const image = (id: string, name: string) => ({
		id,
		storage_path: `${POST_ID}/${name}`,
		filename: name,
		mime_type: 'image/jpeg',
	});

	it('bierze ścieżkę z repo niezależnie od tego, którym adresem asset był mapowany', () => {
		const map = new Map([
			[legacyUrl('a.jpg'), './a.jpg'],
			[`/api/posts/${POST_ID}/assets/img-2/file`, './b.jpg'],
		]);
		expect(galleryUrlsFromAssets([image('img-1', 'a.jpg'), image('img-2', 'b.jpg')], map)).toEqual([
			'./a.jpg',
			'./b.jpg',
		]);
	});

	it('pomija zdjęcie, którego nie ma w repo — galeria nie pokaże adresu panelu', () => {
		expect(galleryUrlsFromAssets([image('img-1', 'a.jpg')], new Map())).toEqual([]);
	});
});

describe('prepareAstroPostFromGallery', () => {
	it('pierwsze zdjęcie z galerii = cover, reszta pod spodem', () => {
		const out = prepareAstroPostFromGallery('Tekst wpisu.', ['./a.jpg', './b.jpg']);
		expect(out.coverImage).toBe('./a.jpg');
		expect(out.galleryImages).toEqual(['./b.jpg']);
		expect(out.bodyMd).toBe('Tekst wpisu.');
		expect(out.excerpt).toContain('Tekst');
	});
});
