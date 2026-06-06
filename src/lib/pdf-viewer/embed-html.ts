import { defaultPdfViewerLabels } from './default-labels';
import type { PdfViewerLabels } from './types';
import { PDF_VIEWER_SCRIPT_PATH } from './types';

function escapeAttr(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

export function pdfEmbedHtml(
	src: string,
	title: string,
	labels: PdfViewerLabels = defaultPdfViewerLabels,
	forPublish = false,
): string {
	const safeSrc = escapeAttr(src);
	const safeTitle = escapeAttr(title);
	const safeLabels = escapeAttr(JSON.stringify(labels));
	const div =
		`<div class="op-pdf-viewer" data-op-pdf-src="${safeSrc}" ` +
		`data-op-pdf-title="${safeTitle}" data-op-pdf-labels="${safeLabels}"></div>`;
	if (!forPublish) return div;
	return `${div}<script type="module" src="${PDF_VIEWER_SCRIPT_PATH}"></script>`;
}
