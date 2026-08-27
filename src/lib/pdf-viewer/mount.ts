import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { defaultPdfViewerLabels } from './default-labels';
import { pdfDocumentOptions } from './document-options';
import { mountWhenVisible } from './lazy-mount';
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

async function loadPdfDocument(src: string): Promise<PDFDocumentProxy> {
	const origin = typeof window === 'undefined' ? null : window.location.origin;
	const task = pdfjsLib.getDocument(pdfDocumentOptions(src, origin));
	return task.promise;
}

export function mountPdfThumbs(root: ParentNode = document): void {
	injectStyles();
	const nodes = root.querySelectorAll<HTMLElement>(
		'.op-pdf-thumb[data-pdf-src]:not([data-pdf-thumb-mounted])',
	);
	for (const el of nodes) {
		void mountThumb(el);
	}
}

export function mountPdfViewers(root: ParentNode = document): void {
	injectStyles();
	const nodes = root.querySelectorAll<HTMLElement>(
		'.op-pdf-viewer[data-op-pdf-src]:not([data-op-pdf-mounted]):not([data-op-pdf-pending])',
	);
	for (const el of nodes) {
		if (isLegacyIframeViewer(el)) continue;
		// Znacznik oczekiwania: bez niego kolejne wywołanie zawiesiłoby drugi
		// obserwator na tym samym widgecie — `data-op-pdf-mounted` pojawia się
		// dopiero przy wejściu w widok.
		el.setAttribute('data-op-pdf-pending', '');
		mountWhenVisible(el, (target) => {
			target.removeAttribute('data-op-pdf-pending');
			void mountOne(target);
		});
	}
}

async function mountThumb(el: HTMLElement): Promise<void> {
	const src = el.getAttribute('data-pdf-src');
	if (!src) return;

	el.setAttribute('data-pdf-thumb-mounted', '');
	const title = el.getAttribute('data-pdf-title') ?? 'PDF';
	const fallback = el.querySelector<HTMLElement>('.op-pdf-thumb-fallback');

	const canvas = document.createElement('canvas');
	canvas.setAttribute('role', 'img');
	canvas.setAttribute('aria-label', title);
	el.replaceChildren(canvas);
	if (fallback) el.append(fallback);

	const host = el.parentElement ?? el;
	const width = host.clientWidth || 640;
	const height = host.clientHeight || Math.round((width * 10) / 16);

	try {
		const pdf = await loadPdfDocument(src);
		const page = await pdf.getPage(1);
		const base = page.getViewport({ scale: 1 });
		const scale = Math.max(width / base.width, height / base.height, 0.1);
		const viewport = page.getViewport({ scale });
		const ctx = canvas.getContext('2d');
		if (!ctx) throw new Error('canvas_unavailable');

		canvas.width = Math.floor(viewport.width);
		canvas.height = Math.floor(viewport.height);
		await page.render({ canvas, canvasContext: ctx, viewport }).promise;
		fallback?.remove();
	} catch {
		el.classList.add('op-pdf-thumb--error');
		canvas.remove();
		if (fallback) fallback.hidden = false;
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
		pdf = await loadPdfDocument(src);
		const firstPage = await pdf.getPage(1);
		const baseViewport = firstPage.getViewport({ scale: 1 });
		const stageWidth = stage.clientWidth || el.clientWidth || baseViewport.width;
		const fitScale = (stageWidth - 32) / baseViewport.width;
		if (Number.isFinite(fitScale) && fitScale > 0) {
			scale = Math.min(1.1, Math.max(0.6, fitScale));
		}
		updatePageInfo();
		await renderPage();
	} catch {
		showError();
	}
}
