/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('initLayoutSlotDialogs', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
		vi.resetModules();
	});

	it('otwiera dialog po kliknięciu przycisku Ustawienia', async () => {
		const showModal = vi.fn();
		HTMLDialogElement.prototype.showModal = showModal;

		document.body.innerHTML = `
			<article class="layout-slot-card" data-slot-id="home_pinned">
				<button type="button" class="slot-settings-open" data-dialog-id="slot-dialog-home_pinned">Ustawienia</button>
			</article>
			<dialog id="slot-dialog-home_pinned" class="slot-settings-dialog">
				<button type="button" class="slot-dialog-close">Zamknij</button>
				<div id="slot-panel-home_pinned"></div>
			</dialog>
		`;

		const { initLayoutSlotDialogs } = await import('@/lib/admin/layout-slot-dialog-client');
		initLayoutSlotDialogs();

		document.querySelector<HTMLButtonElement>('.slot-settings-open')?.click();
		expect(showModal).toHaveBeenCalledTimes(1);
	});
});

describe('refreshSlotCardSummary', () => {
	it('escapuje URL z pola zewnętrznego w chipie', async () => {
		document.body.innerHTML = `
			<article class="layout-slot-card" data-slot-id="home.banner">
				<input type="checkbox" class="slot-card-enabled" checked />
				<div data-slot-summary="home.banner"></div>
			</article>
			<div id="slot-panel-home.banner">
				<select class="slot-banner-link-type">
					<option value="external" selected>external</option>
				</select>
				<div class="slot-banner-field-external"><input value="<img src=x onerror=alert(1)>" /></div>
			</div>
		`;
		const { refreshSlotCardSummary } = await import('@/lib/admin/layout-slot-dialog-client');
		refreshSlotCardSummary('home.banner');
		const summary = document.querySelector('[data-slot-summary="home.banner"]')?.innerHTML ?? '';
		expect(summary).not.toContain('<img src=x');
		expect(summary).toContain('&lt;img');
	});
});
