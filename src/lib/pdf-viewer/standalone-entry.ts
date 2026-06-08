import { configurePdfWorker, mountPdfThumbs, mountPdfViewers } from './mount';
import { PDF_WORKER_PUBLIC_PATH } from './types';

configurePdfWorker(PDF_WORKER_PUBLIC_PATH);

const run = () => {
	mountPdfThumbs();
	mountPdfViewers();
};
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', run, { once: true });
} else {
	run();
}
