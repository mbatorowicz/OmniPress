import { configurePdfWorker, mountPdfViewers } from './mount';
import { PDF_WORKER_PUBLIC_PATH } from './types';

export function initPdfViewers(): void {
	configurePdfWorker(PDF_WORKER_PUBLIC_PATH);

	const run = () => mountPdfViewers();
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', run, { once: true });
	} else {
		run();
	}
}
