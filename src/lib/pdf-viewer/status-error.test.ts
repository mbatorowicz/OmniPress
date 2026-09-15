/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { renderPdfOpenError } from './status-error';

describe('renderPdfOpenError', () => {
	it('buduje link przez DOM, nie innerHTML', () => {
		const status = document.createElement('p');
		renderPdfOpenError(status, './uchwala.pdf', 'Błąd.', 'Otwórz');
		const link = status.querySelector('a');
		expect(link).not.toBeNull();
		expect(link?.getAttribute('href')).toBe('./uchwala.pdf');
		expect(link?.textContent).toBe('Otwórz');
		expect(status.innerHTML).not.toContain('javascript:');
	});

	it('odrzuca javascript: i nie wstawia href', () => {
		const status = document.createElement('p');
		renderPdfOpenError(status, 'javascript:alert(1)', 'Błąd.', 'Otwórz');
		expect(status.querySelector('a')).toBeNull();
		expect(status.textContent).toContain('Błąd.');
	});
});
