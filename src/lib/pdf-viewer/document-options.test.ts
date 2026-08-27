import { describe, expect, it } from 'vitest';
import { isPanelAssetEndpoint, pdfDocumentOptions } from './document-options';

const ORIGIN = 'https://omni-press.vercel.app';

describe('pdfDocumentOptions', () => {
	it('pozwala czytać zakresami statyczny plik strony (ścieżka absolutna)', () => {
		expect(pdfDocumentOptions('/post-files/wpis/plik.pdf', ORIGIN)).toEqual({
			url: '/post-files/wpis/plik.pdf',
		});
	});

	it('pozwala czytać zakresami plik obok wpisu (ścieżka względna)', () => {
		expect(pdfDocumentOptions('./plik.pdf', ORIGIN)).toEqual({ url: './plik.pdf' });
	});

	it('pozwala czytać zakresami plik z zewnętrznego hosta', () => {
		const src = 'https://xyz.supabase.co/storage/v1/object/public/post-assets/a/b.pdf';
		expect(pdfDocumentOptions(src, ORIGIN)).toEqual({ url: src });
	});

	it('wymusza pełne pobranie i cookie dla endpointu panelu', () => {
		const src = '/api/posts/11111111-2222-3333-4444-555555555555/assets/abc/file';
		expect(pdfDocumentOptions(src, ORIGIN)).toEqual({
			url: src,
			disableRange: true,
			disableStream: true,
			withCredentials: true,
		});
	});

	it('rozpoznaje endpoint panelu podany pełnym URL-em tego samego origin', () => {
		const src = `${ORIGIN}/api/posts/p1/assets/a1/file`;
		expect(pdfDocumentOptions(src, ORIGIN).disableRange).toBe(true);
	});

	it('nie gubi rozpoznania przy query stringu', () => {
		expect(isPanelAssetEndpoint('/api/posts/p1/assets/a1/file?v=2', ORIGIN)).toBe(true);
		expect(isPanelAssetEndpoint('/api/posts/p1/assets/a1/file#page=3', ORIGIN)).toBe(true);
	});

	it('nie traktuje innej trasy API jako endpointu załącznika', () => {
		expect(isPanelAssetEndpoint('/api/posts/p1/assets/a1', ORIGIN)).toBe(false);
		expect(isPanelAssetEndpoint('/api/posts/p1/publish', ORIGIN)).toBe(false);
	});

	it('nie ufa obcemu hostowi udającemu ścieżkę panelu', () => {
		const src = 'https://zly.example/api/posts/p1/assets/a1/file';
		expect(pdfDocumentOptions(src, ORIGIN)).toEqual({ url: src });
	});

	it('działa bez znanego origin (render poza przeglądarką)', () => {
		expect(pdfDocumentOptions('/api/posts/p1/assets/a1/file', null).disableRange).toBe(true);
		expect(pdfDocumentOptions('https://host/plik.pdf', null)).toEqual({
			url: 'https://host/plik.pdf',
		});
	});
});
