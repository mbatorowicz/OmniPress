/** Potwierdzenie akcji destrukcyjnej — wspólny handler dla data-confirm. */
export function confirmAction(message: string, count?: number): boolean {
	const text = count !== undefined ? message.replace('{n}', String(count)) : message;
	return confirm(text);
}

/** Podłącza data-confirm na przyciskach submit i formularzach w kontenerze. */
export function bindConfirmHandlers(root: ParentNode = document): void {
	for (const el of root.querySelectorAll('[data-confirm]')) {
		if (el instanceof HTMLFormElement) {
			el.addEventListener('submit', (e) => {
				const msg = el.getAttribute('data-confirm');
				if (msg && !confirmAction(msg)) e.preventDefault();
			});
			continue;
		}
		if (!(el instanceof HTMLButtonElement) || el.type !== 'submit') continue;
		const form = el.form;
		if (!form) continue;
		form.addEventListener('submit', (e) => {
			if (e.submitter !== el) return;
			const msg = el.getAttribute('data-confirm');
			if (msg && !confirmAction(msg)) e.preventDefault();
		});
	}
}
