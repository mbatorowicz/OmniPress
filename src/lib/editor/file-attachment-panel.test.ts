/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { mountFileAttachmentPanel } from './file-attachment-panel';

function mount(assets: Array<{ id: string; filename: string }>) {
	document.body.innerHTML = `
		<div data-post-id="p1" data-label-filename="Nazwa załącznika" data-label-link="Link" data-label-embed="Podgląd">
			<ul data-pdf-list></ul>
			<input type="hidden" data-pdf-order />
			<p data-pdf-empty></p>
		</div>
	`;
	const root = document.body.firstElementChild as HTMLElement;
	mountFileAttachmentPanel(
		root,
		'pdf',
		assets.map((a) => ({
			id: a.id,
			url: `https://example.test/${a.id}.pdf`,
			filename: a.filename,
			display_mode: 'embed',
		})),
	);
	return root;
}

function filenameInput(root: HTMLElement, id: string): HTMLInputElement {
	return root.querySelector(`input[name="asset_filename_${id}"]`) as HTMLInputElement;
}

describe('edycja nazwy załącznika', () => {
	it('pokazuje pole z bieżącą nazwą', () => {
		const root = mount([{ id: 'a1', filename: 'Miedzna — rejon 1' }]);
		const input = filenameInput(root, 'a1');
		expect(input.value).toBe('Miedzna — rejon 1');
		expect(input.getAttribute('aria-label')).toBe('Nazwa załącznika');
	});

	it('zachowuje zmienioną nazwę po zmianie kolejności', () => {
		const root = mount([
			{ id: 'a1', filename: 'Rejon 1' },
			{ id: 'a2', filename: 'Rejon 2' },
		]);
		const first = filenameInput(root, 'a1');
		first.value = 'Miedzna — rejon 1';
		first.dispatchEvent(new Event('input'));

		(root.querySelector('[data-pdf-down]') as HTMLElement).click();

		expect(filenameInput(root, 'a1').value).toBe('Miedzna — rejon 1');
		expect(filenameInput(root, 'a2').value).toBe('Rejon 2');
		expect((root.querySelector('[data-pdf-order]') as HTMLInputElement).value).toBe('a2,a1');
	});

	it('przy pustym polu przywraca ostatnią nazwę', () => {
		const root = mount([{ id: 'a1', filename: 'Rejon 1' }]);
		const input = filenameInput(root, 'a1');
		input.value = '';
		input.dispatchEvent(new Event('input'));
		input.dispatchEvent(new Event('blur'));
		expect(input.value).toBe('Rejon 1');
	});
});
