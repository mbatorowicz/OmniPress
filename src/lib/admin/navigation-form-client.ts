/**
 * Edytor nawigacji po stronie klienta — montaż na stronie i podpięcie nasłuchów.
 * Reszta w modułach obok: `nav-form-dom` (odczyt DOM), `nav-form-fields` (kontrolki wiersza),
 * `nav-form-dropdown` (układ menu), `nav-form-markup` (HTML nowej pozycji),
 * `nav-form-summary` (kafelek pozycji), `nav-form-rows` (cykl życia wiersza), `nav-form-events` (zdarzenia).
 */
import { applyNavEditorDepthAccentToElement } from '@/lib/admin/nav-editor-colors';
import type { NavigationTableLabels } from './nav-form-labels';
import { getEditorRows, getNavEntries, readNavTargetOptions } from './nav-form-dom';
import { refreshAllParentSelects, syncSubmitFields } from './nav-form-fields';
import { syncDropdownLayoutSubmit } from './nav-form-dropdown';
import { resetNavEntryIds } from './nav-form-markup';
import { syncNavRowSummary } from './nav-form-summary';
import { initNavigationRow } from './nav-form-rows';
import { handleNavigationChange, handleNavigationClick } from './nav-form-events';

export type { NavigationTableLabels };

function bindDepthColorInputs(body: HTMLElement): void {
	const form = body.closest('form');
	const interactionRoot = form instanceof HTMLFormElement ? form : document;
	interactionRoot.querySelectorAll('.nav-depth-color-input').forEach((input) => {
		if (!(input instanceof HTMLInputElement)) return;
		if (input.dataset.navColorBound === '1') return;
		input.dataset.navColorBound = '1';
		input.addEventListener('input', () => {
			const depthRaw = input.dataset.navDepthColor;
			if (depthRaw === undefined) return;
			const depth = Number.parseInt(depthRaw, 10);
			if (Number.isNaN(depth)) return;
			applyNavEditorDepthAccentToElement(body, depth, input.value);
		});
	});
}

function bindSubmitSync(form: HTMLFormElement, body: HTMLElement): void {
	if (form.dataset.navigationSubmitSync === '1') return;
	form.dataset.navigationSubmitSync = '1';
	form.addEventListener(
		'submit',
		() => {
			getEditorRows(body).forEach((row) => {
				syncSubmitFields(row);
				syncDropdownLayoutSubmit(row);
			});
			// Pola wierszy są źródłem prawdy — surowy JSON z textarea nie może ich nadpisać.
			const json = form.querySelector('[name=navigation_json]');
			if (json instanceof HTMLTextAreaElement) json.value = '';
		},
		{ capture: true },
	);
}

function bindInteractions(
	interactionRoot: HTMLElement,
	body: HTMLElement,
	labels: NavigationTableLabels,
): void {
	if (interactionRoot.dataset.navigationFormBound === '1') return;
	interactionRoot.dataset.navigationFormBound = '1';
	interactionRoot.addEventListener('change', (event) => {
		handleNavigationChange(event, body, labels);
	});
	interactionRoot.addEventListener('input', (event) => {
		handleNavigationChange(event, body, labels);
	});
	interactionRoot.addEventListener('click', (event) => {
		const opts = readNavTargetOptions();
		if (opts) handleNavigationClick(event, labels, opts);
	});
}

export function mountNavigationForm(labels: NavigationTableLabels): void {
	const mount = (): void => {
		const body = document.getElementById('navigation-body');
		const options = readNavTargetOptions();
		if (!(body instanceof HTMLElement) || !options) return;

		resetNavEntryIds(getNavEntries(body).length);
		bindDepthColorInputs(body);

		const form = body.closest('form');
		const interactionRoot =
			form instanceof HTMLFormElement ? form : (body.parentElement ?? document);

		getEditorRows(body).forEach((row) => {
			initNavigationRow(row, options, body, labels);
			syncNavRowSummary(row, labels, options);
		});
		refreshAllParentSelects(body, labels);

		if (form instanceof HTMLFormElement) bindSubmitSync(form, body);
		if (interactionRoot instanceof HTMLElement) bindInteractions(interactionRoot, body, labels);
	};

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', mount, { once: true });
	} else {
		mount();
	}
	document.addEventListener('astro:page-load', mount);
}
