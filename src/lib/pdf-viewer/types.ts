export type PdfViewerLabels = {
	prev: string;
	next: string;
	page: string;
	of: string;
	zoomIn: string;
	zoomOut: string;
	download: string;
	loading: string;
	error: string;
	open: string;
};

export const PDF_VIEWER_SCRIPT_PATH = '/omnipress/pdf-viewer.js';
export const PDF_WORKER_PUBLIC_PATH = '/omnipress/pdf.worker.mjs';
