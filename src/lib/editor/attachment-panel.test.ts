/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAttachmentPanel, type AttachmentAsset } from './attachment-panel';
import { uploadPostAsset } from './upload-asset';

vi.mock('./upload-asset', () => ({
	uploadPostAsset: vi.fn(),
}));

const uploadMock = vi.mocked(uploadPostAsset);

const labels = {
	moveUp: 'W górę',
	moveDown: 'W dół',
	remove: 'Usuń',
	confirmRemove: 'Na pewno?',
	removeFailed: 'Nie udało się usunąć',
};

function renderRow({
	asset,
	index,
	total,
	attr,
}: {
	asset: AttachmentAsset;
	index: number;
	total: number;
	attr: (a: 'up' | 'down' | 'remove') => string;
}): HTMLElement {
	const li = document.createElement('li');
	li.innerHTML = `
		<span data-filename>${asset.filename}</span>
		<button ${attr('up')} ${index === 0 ? 'disabled' : ''}></button>
		<button ${attr('down')} ${index === total - 1 ? 'disabled' : ''}></button>
		<button ${attr('remove')}></button>
	`;
	return li;
}

function mount(assets: AttachmentAsset[], options: { postId?: string } = {}) {
	document.body.innerHTML = `
		<div data-post-id="${options.postId ?? 'post-1'}">
			<p data-pdf-empty class="hidden">Brak</p>
			<ul data-pdf-list></ul>
			<input type="hidden" data-pdf-order />
			<label><input type="file" data-pdf-upload /></label>
		</div>
	`;
	const root = document.body.firstElementChild as HTMLElement;
	if (!options.postId && options.postId !== undefined) root.removeAttribute('data-post-id');

	const panel = createAttachmentPanel<AttachmentAsset, typeof labels>(root, {
		prefix: 'pdf',
		kind: 'pdf',
		labels,
		initialAssets: assets,
		renderItem: renderRow,
		toAsset: (u) => ({ id: u.id, url: u.url, filename: u.filename }),
	});

	return { root, panel };
}

const asset = (id: string): AttachmentAsset => ({
	id,
	url: `https://example.test/${id}.pdf`,
	filename: `${id}.pdf`,
});

function filenames(root: HTMLElement): string[] {
	return [...root.querySelectorAll('[data-filename]')].map((el) => el.textContent ?? '');
}

function orderValue(root: HTMLElement): string {
	return (root.querySelector('[data-pdf-order]') as HTMLInputElement).value;
}

describe('createAttachmentPanel', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
		vi.stubGlobal('URL', {
			...URL,
			createObjectURL: vi.fn(() => 'blob:pending-preview'),
			revokeObjectURL: vi.fn(),
		});
	});

	afterEach(() => {
		uploadMock.mockReset();
		vi.unstubAllGlobals();
	});

	it('renderuje załączniki w kolejności i zapisuje ją w ukrytym polu', () => {
		const { root } = mount([asset('a'), asset('b'), asset('c')]);

		expect(filenames(root)).toEqual(['a.pdf', 'b.pdf', 'c.pdf']);
		expect(orderValue(root)).toBe('a,b,c');
		expect([...root.querySelectorAll('li')].map((li) => li.dataset.assetId)).toEqual([
			'a',
			'b',
			'c',
		]);
	});

	it('chowa komunikat o pustej liście, gdy załączniki są', () => {
		const { root } = mount([asset('a')]);
		expect(root.querySelector('[data-pdf-empty]')?.classList.contains('hidden')).toBe(true);
	});

	it('pokazuje komunikat o pustej liście, gdy załączników nie ma', () => {
		const { root } = mount([]);
		expect(root.querySelector('[data-pdf-empty]')?.classList.contains('hidden')).toBe(false);
	});

	it('przenosi załącznik w dół i aktualizuje kolejność', () => {
		const { root } = mount([asset('a'), asset('b'), asset('c')]);

		(root.querySelectorAll('[data-pdf-down]')[0] as HTMLElement).click();

		expect(filenames(root)).toEqual(['b.pdf', 'a.pdf', 'c.pdf']);
		expect(orderValue(root)).toBe('b,a,c');
	});

	it('przenosi załącznik w górę i aktualizuje kolejność', () => {
		const { root } = mount([asset('a'), asset('b'), asset('c')]);

		(root.querySelectorAll('[data-pdf-up]')[2] as HTMLElement).click();

		expect(filenames(root)).toEqual(['a.pdf', 'c.pdf', 'b.pdf']);
		expect(orderValue(root)).toBe('a,c,b');
	});

	it('nie wychodzi poza zakres na krańcach listy', () => {
		const { root } = mount([asset('a'), asset('b')]);

		(root.querySelectorAll('[data-pdf-up]')[0] as HTMLElement).click();
		(root.querySelectorAll('[data-pdf-down]')[1] as HTMLElement).click();

		expect(orderValue(root)).toBe('a,b');
	});

	it('nie usuwa niczego, gdy użytkownik anuluje potwierdzenie', async () => {
		const fetchSpy = vi.fn();
		vi.stubGlobal('confirm', () => false);
		vi.stubGlobal('fetch', fetchSpy);

		const { root } = mount([asset('a'), asset('b')]);
		(root.querySelectorAll('[data-pdf-remove]')[0] as HTMLElement).click();
		await Promise.resolve();

		expect(fetchSpy).not.toHaveBeenCalled();
		expect(orderValue(root)).toBe('a,b');
	});

	it('usuwa załącznik po potwierdzeniu i odświeża kolejność', async () => {
		vi.stubGlobal('confirm', () => true);
		const fetchSpy = vi.fn(async () => ({ ok: true, json: async () => ({}) }));
		vi.stubGlobal('fetch', fetchSpy);

		const { root } = mount([asset('a'), asset('b')]);
		(root.querySelectorAll('[data-pdf-remove]')[0] as HTMLElement).click();
		await vi.waitFor(() => expect(orderValue(root)).toBe('b'));

		expect(fetchSpy).toHaveBeenCalledWith('/api/posts/post-1/assets/a', {
			method: 'DELETE',
			credentials: 'same-origin',
		});
		expect(filenames(root)).toEqual(['b.pdf']);
	});

	it('przy błędzie usuwania pokazuje komunikat i odblokowuje przycisk', async () => {
		vi.stubGlobal('confirm', () => true);
		vi.stubGlobal('fetch', async () => ({ ok: false, json: async () => ({ error: 'Zajęty' }) }));
		const alertSpy = vi.fn();
		vi.stubGlobal('alert', alertSpy);

		const { root } = mount([asset('a')]);
		const button = root.querySelector('[data-pdf-remove]') as HTMLElement;
		button.click();
		await vi.waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Zajęty'));

		expect(orderValue(root)).toBe('a');
		expect(button.hasAttribute('disabled')).toBe(false);
	});

	it('zgłasza komunikat zastępczy, gdy sieć padnie', async () => {
		vi.stubGlobal('confirm', () => true);
		vi.stubGlobal('fetch', async () => {
			throw new Error('offline');
		});
		const alertSpy = vi.fn();
		vi.stubGlobal('alert', alertSpy);

		const { root } = mount([asset('a')]);
		(root.querySelector('[data-pdf-remove]') as HTMLElement).click();
		await vi.waitFor(() => expect(alertSpy).toHaveBeenCalledWith(labels.removeFailed));

		expect(orderValue(root)).toBe('a');
	});

	it('nie montuje panelu bez identyfikatora wpisu', () => {
		document.body.innerHTML = '<div><ul data-pdf-list></ul></div>';
		const root = document.body.firstElementChild as HTMLElement;

		const panel = createAttachmentPanel<AttachmentAsset, typeof labels>(root, {
			prefix: 'pdf',
			kind: 'pdf',
			labels,
			initialAssets: [asset('a')],
			renderItem: renderRow,
			toAsset: (u) => ({ id: u.id, url: u.url, filename: u.filename }),
		});

		expect(panel).toBeNull();
		expect(root.querySelectorAll('li')).toHaveLength(0);
	});

	it('append dokłada załącznik na koniec listy', () => {
		const { root, panel } = mount([asset('a')]);

		panel?.append(asset('b'));

		expect(filenames(root)).toEqual(['a.pdf', 'b.pdf']);
		expect(orderValue(root)).toBe('a,b');
	});

	it('podczas uploadu pokazuje wiersz postępu, a po sukcesie gotowy plik', async () => {
		let report!: (fraction: number) => void;
		let finish!: (value: Awaited<ReturnType<typeof uploadPostAsset>>) => void;
		uploadMock.mockImplementation((_postId, _file, _kind, _labels, onProgress) => {
			report = onProgress ?? (() => {});
			return new Promise((resolve) => {
				finish = resolve;
			});
		});

		const { root } = mount([]);
		root.dataset.labelUploading = 'Wysyłanie…';
		const input = root.querySelector('[data-pdf-upload]') as HTMLInputElement;
		const file = new File(['x'], 'akt.pdf', { type: 'application/pdf' });
		Object.defineProperty(input, 'files', { value: [file] });
		input.dispatchEvent(new Event('change'));

		await vi.waitFor(() => expect(root.querySelector('[data-pending-id]')).toBeTruthy());
		expect(root.querySelector('[data-pdf-empty]')?.classList.contains('hidden')).toBe(true);
		expect(orderValue(root)).toBe('');

		report(0.4);
		await vi.waitFor(() =>
			expect(root.querySelector('[data-upload-status]')?.textContent).toBe('Wysyłanie… 40%'),
		);

		finish({
			ok: true,
			asset: {
				id: 'new',
				url: 'https://example.test/new.pdf',
				filename: 'akt.pdf',
				mime_type: 'application/pdf',
				display_mode: 'link',
				sort_order: 0,
			},
			markdown: null,
		});

		await vi.waitFor(() => expect(filenames(root)).toEqual(['akt.pdf']));
		expect(root.querySelector('[data-pending-id]')).toBeNull();
		expect(orderValue(root)).toBe('new');
	});
});
