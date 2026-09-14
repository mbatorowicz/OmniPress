import { defaultPdfViewerLabels } from './default-labels';
import type { PdfViewerLabels } from './types';

function escapeAttr(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

/** Viewer ładuje Layout strony — treść wpisu to tylko blok `div`, bez skryptu. */
export function pdfEmbedHtml(
	src: string,
	title: string,
	labels: PdfViewerLabels = defaultPdfViewerLabels,
	_forPublish = false,
): string {
	const safeSrc = escapeAttr(src);
	const safeTitle = escapeAttr(title);
	const safeLabels = escapeAttr(JSON.stringify(labels));
	return (
		`<div class="op-pdf-viewer" data-op-pdf-src="${safeSrc}" ` +
		`data-op-pdf-title="${safeTitle}" data-op-pdf-labels="${safeLabels}"></div>`
	);
}
