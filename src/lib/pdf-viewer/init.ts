import { configurePdfWorker, mountPdfViewers } from './mount';
import { interceptSameTabPdfClicks } from './pdf-open';
import { PDF_WORKER_PUBLIC_PATH } from './types';

export function initPdfViewers(): void {
	configurePdfWorker(PDF_WORKER_PUBLIC_PATH);
	interceptSameTabPdfClicks();

	const run = () => mountPdfViewers();
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', run, { once: true });
	} else {
		run();
	}
}
