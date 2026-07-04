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
