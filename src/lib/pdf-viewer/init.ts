import workerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { configurePdfWorker, mountPdfViewers } from './mount';

export function initPdfViewers(): void {
	configurePdfWorker(workerUrl);

	const run = () => mountPdfViewers();
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', run, { once: true });
	} else {
		run();
	}
}
