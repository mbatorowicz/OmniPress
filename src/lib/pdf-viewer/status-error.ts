import { isSafeUrl } from '@/lib/content/sanitize-url';

/** Komunikat błędu PDF bez `innerHTML` — href tylko z allowlisty. */
export function renderPdfOpenError(
	status: HTMLElement,
	src: string,
	errorLabel: string,
	openLabel: string,
): void {
	status.replaceChildren();
	status.append(errorLabel, ' ');
	if (!isSafeUrl(src)) return;
	const link = document.createElement('a');
	link.href = src;
	link.target = '_blank';
	link.rel = 'noopener noreferrer';
	link.textContent = openLabel;
	status.append(link);
}
