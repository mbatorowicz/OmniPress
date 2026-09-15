import { isPanelAssetEndpoint } from './document-options';
import { isPdfHref, pdfFilenameFromSrc } from './pdf-href';

const NEW_TAB_FEATURES = 'noopener,noreferrer';

function isModifiedClick(event: MouseEvent): boolean {
	return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

/** Nowa karta — strona gminy zostaje; Chrome PDF viewer nie psuje historii. */
export function openPdfInNewTab(src: string): void {
	window.open(src, '_blank', NEW_TAB_FEATURES);
}

/**
 * Pobranie jako plik. Chrome ignoruje `download` przy `application/pdf`
 * i zamiast tego wchodzi w chrome-extension viewer w tej samej karcie.
 */
export async function downloadPdfFile(src: string): Promise<void> {
	const origin = window.location.origin;
	const credentials = isPanelAssetEndpoint(src, origin) ? 'include' : 'same-origin';
	const res = await fetch(src, { credentials });
	if (!res.ok) throw new Error('pdf_download_failed');

	const blob = await res.blob();
	const objectUrl = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = objectUrl;
	a.download = pdfFilenameFromSrc(src);
	a.rel = 'noopener';
	document.body.append(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(objectUrl);
}

export function bindPdfDownloadLink(link: HTMLAnchorElement, src: string): void {
	link.href = src;
	link.target = '_blank';
	link.rel = 'noopener noreferrer';
	link.setAttribute('download', pdfFilenameFromSrc(src));
	link.addEventListener('click', (event) => {
		if (isModifiedClick(event)) return;
		event.preventDefault();
		void downloadPdfFile(src).catch(() => {
			openPdfInNewTab(src);
		});
	});
}

/**
 * Klik w link PDF bez `target=_blank` / `download` otwiera nową kartę.
 * Inaczej Chrome podmienia historię na chrome-extension:// i nie da się wrócić.
 */
export function interceptSameTabPdfClicks(doc: Document = document): void {
	if (doc.documentElement.dataset.opPdfNav === 'true') return;
	doc.documentElement.dataset.opPdfNav = 'true';
	doc.addEventListener('click', onPdfLinkClick);
}

function onPdfLinkClick(event: MouseEvent): void {
	if (event.defaultPrevented || isModifiedClick(event)) return;
	const target = event.target;
	if (!(target instanceof Element)) return;
	const a = target.closest('a[href]');
	if (!(a instanceof HTMLAnchorElement)) return;
	if (a.target === '_blank' || a.hasAttribute('download')) return;
	const href = a.getAttribute('href') ?? '';
	if (!isPdfHref(href)) return;
	event.preventDefault();
	openPdfInNewTab(a.href);
}
