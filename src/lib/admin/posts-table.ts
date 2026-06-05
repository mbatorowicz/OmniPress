export function initAdminPostsBulkForm(): void {
	const form = document.getElementById('bulk-posts-form');
	if (!(form instanceof HTMLFormElement)) return;

	const selectedTemplate = form.dataset.selectedTemplate ?? 'Zaznaczono: {n}';
	const checkboxes = form.querySelectorAll('[data-post-checkbox]');
	const selectAll = form.querySelector('[data-select-all]');
	const label = form.querySelector('[data-selected-label]');
	const deactivateBtn = form.querySelector('[data-bulk-deactivate]');
	const deleteBtn = form.querySelector('[data-bulk-delete]');

	function selectedCount() {
		return [...checkboxes].filter((cb) => cb instanceof HTMLInputElement && cb.checked).length;
	}

	function syncUi() {
		const n = selectedCount();
		const total = checkboxes.length;

		if (label instanceof HTMLElement) {
			label.textContent = selectedTemplate.replace('{n}', String(n));
		}
		for (const btn of [deactivateBtn, deleteBtn]) {
			if (btn instanceof HTMLButtonElement) btn.disabled = n === 0;
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
		const confirmMsg = submitter.getAttribute('data-confirm');
		if (!confirmMsg) return;
		const n = selectedCount();
		if (n === 0) {
			e.preventDefault();
			return;
		}
		if (!confirm(confirmMsg.replace('{n}', String(n)))) e.preventDefault();
	});

	syncUi();
}
