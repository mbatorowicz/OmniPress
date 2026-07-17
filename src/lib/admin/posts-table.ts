import { confirmAction } from '@/lib/ui/confirm';

function initOneBulkForm(form: HTMLFormElement): void {
	const selectedTemplate = form.dataset.selectedTemplate ?? 'Zaznaczono: {n}';
	const checkboxes = form.querySelectorAll('[data-post-checkbox]');
	const selectAll = form.querySelector('[data-select-all]');
	const label = form.querySelector('[data-selected-label]');
	const actionButtons = form.querySelectorAll<HTMLButtonElement>('[data-bulk-action]');
	const rejectNote = form.querySelector<HTMLTextAreaElement>('[data-bulk-reject-note]');

	function selectedCount() {
		return [...checkboxes].filter((cb) => cb instanceof HTMLInputElement && cb.checked).length;
	}

	function syncUi() {
		const n = selectedCount();
		const total = checkboxes.length;

		if (label instanceof HTMLElement) {
			label.textContent = selectedTemplate.replace('{n}', String(n));
		}
		for (const btn of actionButtons) {
			btn.disabled = n === 0;
		}
		if (selectAll instanceof HTMLInputElement && total > 0) {
			selectAll.indeterminate = n > 0 && n < total;
			selectAll.checked = n === total;
		} else if (selectAll instanceof HTMLInputElement) {
			selectAll.checked = false;
			selectAll.indeterminate = false;
		}
	}

	selectAll?.addEventListener('change', () => {
		if (!(selectAll instanceof HTMLInputElement)) return;
		const checked = selectAll.checked;
		for (const cb of checkboxes) {
			if (cb instanceof HTMLInputElement) cb.checked = checked;
		}
		syncUi();
	});

	for (const cb of checkboxes) {
		cb.addEventListener('change', syncUi);
	}

	form.addEventListener('submit', (e) => {
		const submitter = e.submitter;
		if (!(submitter instanceof HTMLButtonElement)) return;
		const n = selectedCount();
		if (n === 0) {
			e.preventDefault();
			return;
		}

		if (submitter.value === 'reject' && rejectNote) {
			const note = rejectNote.value.trim();
			if (note.length < 3) {
				e.preventDefault();
				rejectNote.focus();
				rejectNote.reportValidity?.();
				return;
			}
		}

		const confirmMsg = submitter.getAttribute('data-confirm');
		if (!confirmMsg) return;
		if (!confirmAction(confirmMsg, n)) e.preventDefault();
	});

	syncUi();
}

export function initAdminPostsBulkForm(): void {
	const forms = document.querySelectorAll<HTMLFormElement>('[data-bulk-posts-form]');
	for (const form of forms) {
		initOneBulkForm(form);
	}
}
