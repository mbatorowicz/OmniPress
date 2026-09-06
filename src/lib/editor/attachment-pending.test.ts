/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	createPendingUpload,
	patchPendingProgress,
	renderPendingAttachmentRow,
	renderPendingGalleryCard,
} from './attachment-pending';

describe('attachment-pending', () => {
	beforeEach(() => {
		vi.stubGlobal('URL', {
			...URL,
			createObjectURL: vi.fn(() => 'blob:pending-preview'),
			revokeObjectURL: vi.fn(),
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});
	it('dla zdjęcia tworzy podgląd blob, dla PDF nie', () => {
		const image = createPendingUpload(new File(['x'], 'foto.jpg', { type: 'image/jpeg' }));
		const pdf = createPendingUpload(new File(['%PDF'], 'akt.pdf', { type: 'application/pdf' }));

		expect(image.previewUrl).toBe('blob:pending-preview');
		expect(pdf.previewUrl).toBeNull();
		expect(image.progress).toBe(0);
	});

	it('rysuje wiersz z paskiem i aktualizuje postęp bez przebudowy', () => {
		const pending = createPendingUpload(new File(['x'], 'akt.pdf', { type: 'application/pdf' }));
		const row = renderPendingAttachmentRow(pending, 'Wysyłanie…');
		document.body.append(row);

		expect(row.querySelector('progress')).toHaveProperty('value', 0);
		expect(row.querySelector('[data-upload-status]')?.textContent).toBe('Wysyłanie… 0%');

		pending.progress = 40;
		patchPendingProgress(document.body, pending, 'Wysyłanie…');
		expect(row.querySelector('progress')).toHaveProperty('value', 40);
		expect(row.querySelector('[data-upload-status]')?.textContent).toBe('Wysyłanie… 40%');
	});

	it('karta galerii pokazuje miniaturę z pliku', () => {
		const pending = createPendingUpload(new File(['x'], 'foto.jpg', { type: 'image/jpeg' }));
		const card = renderPendingGalleryCard(pending, 'Wysyłanie…');
		const img = card.querySelector('img');

		expect(img).toBeTruthy();
		expect(img?.getAttribute('src')).toBe(pending.previewUrl);
		expect(img?.getAttribute('alt')).toBe('foto.jpg');
	});
});
