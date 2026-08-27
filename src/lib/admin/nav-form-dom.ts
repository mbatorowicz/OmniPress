/** Odczyt stanu edytora nawigacji z DOM — wyszukiwanie wierszy i wartości kontrolek. */
import { type NavTargetOptions } from '@/lib/admin/nav-target-options';

export const DEPTH_CLASSES = ['nav-row--depth-0', 'nav-row--depth-1', 'nav-row--depth-2'] as const;

/** Opcje celów linku: skrypt JSON w formularzu, a w starszym markupie atrybut data. */
export function readNavTargetOptions(): NavTargetOptions | null {
	const script = document.getElementById('nav-target-options-json');
	if (script?.textContent?.trim()) {
		try {
			return JSON.parse(script.textContent) as NavTargetOptions;
		} catch {
			/* fall through */
		}
	}

	const body = document.getElementById('navigation-body');
	const table = document.getElementById('navigation-table');
	const host =
		body instanceof HTMLElement && body.dataset.navTargetOptions
			? body
			: table instanceof HTMLElement && table.dataset.navTargetOptions
				? table
				: null;
	if (!host) return null;
	const raw = host.dataset.navTargetOptions;
	if (!raw) return null;
	try {
		return JSON.parse(raw) as NavTargetOptions;
	} catch {
		return null;
	}
}

export function getEditorRows(body: HTMLElement): HTMLElement[] {
	return [...body.querySelectorAll('.nav-row-editor')];
}

export function getNavEntries(body: HTMLElement): HTMLElement[] {
	return [...body.querySelectorAll('.nav-entry')];
}

export function getNavEntry(element: HTMLElement): HTMLElement | null {
	const entry = element.closest('.nav-entry');
	return entry instanceof HTMLElement ? entry : null;
}

export function getSummaryForEditor(editorRow: HTMLElement): HTMLElement | null {
	const entry = editorRow.closest('.nav-entry');
	const summary = entry?.querySelector('.nav-row-summary');
	return summary instanceof HTMLElement ? summary : null;
}

export function getEditorForSummary(summaryRow: HTMLElement): HTMLElement | null {
	const entry = summaryRow.closest('.nav-entry');
	const editor = entry?.querySelector('.nav-row-editor');
	return editor instanceof HTMLElement ? editor : null;
}

export function readRowKind(row: HTMLElement): string {
	const kindUi = row.querySelector('.nav-href-kind') as HTMLSelectElement | null;
	return kindUi?.value ?? 'none';
}

export function readRowDepth(row: HTMLElement): number {
	const depthSelect = row.querySelector('.nav-depth') as HTMLSelectElement | null;
	return Math.min(2, Math.max(0, Number(depthSelect?.value ?? 0) || 0));
}

export function readTargetControlValue(row: HTMLElement): string {
	const control = row.querySelector('.nav-href-target-control');
	if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement) {
		return control.value;
	}
	return '';
}

export function readParentValue(row: HTMLElement): number | null {
	const depth = readRowDepth(row);
	if (depth === 0) return null;
	const parent = row.querySelector('.nav-parent') as HTMLSelectElement | null;
	const raw = parent?.value ?? row.dataset.navParent ?? '';
	if (raw === '') return null;
	const parsed = Number(raw);
	return Number.isFinite(parsed) ? parsed : null;
}

export function collectRowMeta(
	body: HTMLElement,
): { label: string; depth: number; parentRowIndex: number | null }[] {
	return getEditorRows(body).map((row) => ({
		label: (row.querySelector('input[name="nav_label"]') as HTMLInputElement | null)?.value ?? '',
		depth: readRowDepth(row),
		parentRowIndex: readParentValue(row),
	}));
}
