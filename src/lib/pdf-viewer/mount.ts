import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { defaultPdfViewerLabels } from './default-labels';
import { PDF_VIEWER_CSS } from './styles';
import type { PdfViewerLabels } from './types';

let workerConfigured = false;
let stylesInjected = false;

export function configurePdfWorker(workerSrc: string): void {
	if (workerConfigured) return;
	pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
	workerConfigured = true;
}

function injectStyles(): void {
	if (stylesInjected || typeof document === 'undefined') return;
	const style = document.createElement('style');
	style.setAttribute('data-op-pdf-styles', '');
	style.textContent = PDF_VIEWER_CSS;
	document.head.appendChild(style);
	stylesInjected = true;
}

function parseLabels(el: HTMLElement): PdfViewerLabels {
	const raw = el.getAttribute('data-op-pdf-labels');
	if (!raw) return defaultPdfViewerLabels;
	try {
		return { ...defaultPdfViewerLabels, ...JSON.parse(raw) as Partial<PdfViewerLabels> };
	} catch {
		return defaultPdfViewerLabels;
	}
}

function isLegacyIframeViewer(el: HTMLElement): boolean {
	return el.querySelector('iframe') instanceof HTMLIFrameElement;
}

export function mountPdfViewers(root: ParentNode = document): void {
	injectStyles();
	const nodes = root.querySelectorAll<HTMLElement>(
		'.op-pdf-viewer[data-op-pdf-src]:not([data-op-pdf-mounted])',
	);
	for (const el of nodes) {
		if (isLegacyIframeViewer(el)) continue;
		void mountOne(el);
	}
}

async function mountOne(el: HTMLElement): Promise<void> {
	const src = el.getAttribute('data-op-pdf-src');
	if (!src) return;

	el.setAttribute('data-op-pdf-mounted', '');
	const labels = parseLabels(el);
	const title = el.getAttribute('data-op-pdf-title') ?? 'PDF';

	const toolbar = document.createElement('div');
	toolbar.className = 'op-pdf-toolbar';

	const prevBtn = document.createElement('button');
	prevBtn.type = 'button';
	prevBtn.textContent = labels.prev;
	prevBtn.setAttribute('aria-label', labels.prev);

	const pageInfo = document.createElement('span');
	pageInfo.className = 'op-pdf-page-info';

	const nextBtn = document.createElement('button');
	nextBtn.type = 'button';
	nextBtn.textContent = labels.next;
	nextBtn.setAttribute('aria-label', labels.next);

	const zoomOutBtn = document.createElement('button');
	zoomOutBtn.type = 'button';
	zoomOutBtn.textContent = labels.zoomOut;
	zoomOutBtn.setAttribute('aria-label', labels.zoomOut);

	const zoomInBtn = document.createElement('button');
	zoomInBtn.type = 'button';
	zoomInBtn.textContent = labels.zoomIn;
	zoomInBtn.setAttribute('aria-label', labels.zoomIn);

	const downloadLink = document.createElement('a');
	downloadLink.href = src;
	downloadLink.textContent = labels.download;
	downloadLink.setAttribute('aria-label', labels.download);
	downloadLink.setAttribute('download', '');

	const stage = document.createElement('div');
	stage.className = 'op-pdf-stage';

	const status = document.createElement('p');
	status.className = 'op-pdf-status';
	status.textContent = labels.loading;

	const canvas = document.createElement('canvas');
	canvas.setAttribute('role', 'img');
	canvas.setAttribute('aria-label', title);
	canvas.hidden = true;

	toolbar.append(prevBtn, pageInfo, nextBtn, zoomOutBtn, zoomInBtn, downloadLink);
	stage.append(status, canvas);
	el.replaceChildren(toolbar, stage);

	let pdf: PDFDocumentProxy | null = null;
	let pageNum = 1;
	let scale = 1.1;
	let rendering = false;

	const updatePageInfo = () => {
		const total = pdf?.numPages ?? 0;
		pageInfo.textContent = total ? `${labels.page} ${pageNum} ${labels.of} ${total}` : '';
		prevBtn.disabled = pageNum <= 1;
		nextBtn.disabled = !pdf || pageNum >= pdf.numPages;
	};

	const showError = () => {
		status.hidden = false;
		canvas.hidden = true;
		status.innerHTML = `${labels.error} <a href="${src}" target="_blank" rel="noopener noreferrer">${labels.open}</a>`;
	};

	const renderPage = async () => {
		if (!pdf || rendering) return;
		rendering = true;
		try {
			const page = await pdf.getPage(pageNum);
			const viewport = page.getViewport({ scale });
			const ctx = canvas.getContext('2d');
			if (!ctx) throw new Error('canvas_unavailable');

			canvas.width = Math.floor(viewport.width);
			canvas.height = Math.floor(viewport.height);
			await page.render({ canvas, canvasContext: ctx, viewport }).promise;

			status.hidden = true;
			canvas.hidden = false;
			updatePageInfo();
		} catch {
			showError();
		} finally {
			rendering = false;
		}
	};

	prevBtn.addEventListener('click', () => {
		if (!pdf || pageNum <= 1) return;
		pageNum -= 1;
		void renderPage();
	});

	nextBtn.addEventListener('click', () => {
		if (!pdf || pageNum >= pdf.numPages) return;
		pageNum += 1;
		void renderPage();
	});

	zoomOutBtn.addEventListener('click', () => {
		scale = Math.max(0.6, scale - 0.15);
		void renderPage();
	});

	zoomInBtn.addEventListener('click', () => {
		scale = Math.min(2.5, scale + 0.15);
		void renderPage();
	});

	try {
		const task = pdfjsLib.getDocument(src);
		pdf = await task.promise;
		updatePageInfo();
		await renderPage();
	} catch {
		showError();
	}
}
