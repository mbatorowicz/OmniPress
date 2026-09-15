/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bindPdfDownloadLink, interceptSameTabPdfClicks } from './pdf-open';

const originalOpen = window.open;
const originalFetch = globalThis.fetch;

afterEach(() => {
	window.open = originalOpen;
	globalThis.fetch = originalFetch;
	document.body.replaceChildren();
	delete document.documentElement.dataset.opPdfNav;
	vi.restoreAllMocks();
});

describe('bindPdfDownloadLink', () => {
	it('pobiera blob zamiast nawigować w tej samej karcie', async () => {
		const blob = new Blob(['%PDF'], { type: 'application/pdf' });
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			blob: async () => blob,
		});
		Object.defineProperty(URL, 'createObjectURL', {
			configurable: true,
			writable: true,
			value: vi.fn(() => 'blob:mock-pdf'),
		});
		Object.defineProperty(URL, 'revokeObjectURL', {
			configurable: true,
			writable: true,
			value: vi.fn(),
		});
		const downloads: string[] = [];
		vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
			this: HTMLAnchorElement,
		) {
			if (this.download) downloads.push(this.download);
		});

		const link = document.createElement('a');
		link.textContent = 'Pobierz PDF';
		document.body.append(link);
		bindPdfDownloadLink(link, '/post-files/wpis/a.pdf');

		expect(link.target).toBe('_blank');
		expect(link.getAttribute('download')).toBe('a.pdf');

		link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
		await vi.waitFor(() => {
			expect(downloads).toContain('a.pdf');
		});
		expect(globalThis.fetch).toHaveBeenCalledWith('/post-files/wpis/a.pdf', {
			credentials: 'same-origin',
		});
	});

	it('przy błędzie fetch otwiera nową kartę', async () => {
		globalThis.fetch = vi.fn().mockRejectedValue(new Error('network'));
		const open = vi.fn();
		window.open = open;

		const link = document.createElement('a');
		document.body.append(link);
		bindPdfDownloadLink(link, '/doc.pdf');
		link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
		await vi.waitFor(() => {
			expect(open).toHaveBeenCalledWith('/doc.pdf', '_blank', 'noopener,noreferrer');
		});
	});
});

describe('interceptSameTabPdfClicks', () => {
	it('otwiera PDF w nowej karcie i nie nawiguje', () => {
		const open = vi.fn();
		window.open = open;
		interceptSameTabPdfClicks(document);

		const a = document.createElement('a');
		a.href = 'https://example.test/uchwala.pdf';
		a.textContent = 'Uchwała';
		document.body.append(a);

		const event = new MouseEvent('click', { bubbles: true, cancelable: true });
		a.dispatchEvent(event);

		expect(event.defaultPrevented).toBe(true);
		expect(open).toHaveBeenCalled();
	});

	it('nie rusza linków z target=_blank ani download', () => {
		const open = vi.fn();
		window.open = open;
		interceptSameTabPdfClicks(document);

		const blank = document.createElement('a');
		blank.href = 'https://example.test/a.pdf';
		blank.target = '_blank';
		document.body.append(blank);
		blank.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

		const dl = document.createElement('a');
		dl.href = 'https://example.test/b.pdf';
		dl.setAttribute('download', '');
		document.body.append(dl);
		dl.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

		expect(open).not.toHaveBeenCalled();
	});
});
