/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { mountFileAttachmentPanel } from './file-attachment-panel';
import { mountGalleryPanel } from './gallery-panel';

const xssName = `"><img src=x onerror=alert(1)>.pdf`;
const xssUrl = `javascript:alert(1)`;

describe('panele załączników — escape nazwy i URL', () => {
	it('galeria nie wstawia nazwy pliku do HTML', () => {
		document.body.innerHTML = `
			<div data-post-id="p1">
				<div data-gallery-grid></div>
				<input type="hidden" data-gallery-order />
			</div>
		`;
		mountGalleryPanel(document.body.firstElementChild as HTMLElement, [
			{ id: 'a1', url: xssUrl, filename: xssName },
		], {
			cover: 'Okładka',
			gallery: 'Galeria',
			empty: '',
			add: '',
			moveUp: '↑',
			moveDown: '↓',
			remove: 'Usuń',
			confirmRemove: '',
			removeFailed: '',
		});

		expect(document.querySelectorAll('img[src="x"]').length).toBe(0);
		expect(document.querySelectorAll('.ui-gallery-card img').length).toBe(1);
		const img = document.querySelector('.ui-gallery-card img');
		expect(img?.getAttribute('src')).toBeNull();
		expect(img?.getAttribute('alt')).toBe(xssName);
		expect(document.querySelector('.ui-hint')?.textContent).toBe(xssName);
	});

	it('lista plików nie wstawia nazwy ani javascript: do HTML', () => {
		document.body.innerHTML = `
			<div data-post-id="p1" data-label-link="Link" data-label-embed="Podgląd">
				<ul data-pdf-list></ul>
				<input type="hidden" data-pdf-order />
				<p data-pdf-empty></p>
			</div>
		`;
		mountFileAttachmentPanel(document.body.firstElementChild as HTMLElement, 'pdf', [
			{ id: 'a1', url: xssUrl, filename: xssName, display_mode: 'link' },
		]);

		expect(document.querySelectorAll('img[src="x"]').length).toBe(0);
		const link = document.querySelector('.ui-link');
		expect(link?.getAttribute('href')).toBeNull();
		expect(link?.textContent).toBe('');
		expect(document.querySelector('.truncate')?.textContent).toBe(xssName);
	});
});
