export const PDF_VIEWER_CSS = `
.op-pdf-viewer {
	margin: 1.25rem 0;
	width: 100%;
	max-width: 100%;
	border: 1px solid var(--color-border);
	border-radius: 0.5rem;
	overflow: hidden;
	background: var(--color-surface-subtle);
	isolation: isolate;
}
.op-pdf-viewer .op-pdf-toolbar {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 0.5rem;
	padding: 0.5rem 0.75rem;
	background: var(--color-surface);
	border-bottom: 1px solid var(--color-border);
	color: var(--color-text-secondary);
	font-size: 0.875rem;
	line-height: 1.4;
}
.op-pdf-viewer .op-pdf-toolbar button,
.op-pdf-viewer .op-pdf-toolbar a {
	padding: 0.25rem 0.625rem;
	border: 1px solid var(--color-border-strong);
	border-radius: 0.375rem;
	background: var(--color-surface-subtle);
	color: var(--color-text-secondary);
	font-size: 0.8125rem;
	cursor: pointer;
	text-decoration: none;
}
.op-pdf-viewer .op-pdf-toolbar button:disabled {
	opacity: 0.45;
	cursor: not-allowed;
}
.op-pdf-viewer .op-pdf-toolbar button:not(:disabled):hover,
.op-pdf-viewer .op-pdf-toolbar a:hover {
	background: var(--color-border);
}
.op-pdf-viewer .op-pdf-page-info {
	min-width: 5.5rem;
	text-align: center;
	color: var(--color-text-muted);
}
.op-pdf-viewer .op-pdf-stage {
	display: flex;
	justify-content: center;
	align-items: flex-start;
	padding: 1rem;
	background: var(--color-surface-muted);
	min-height: 18rem;
	max-height: 75vh;
	overflow: auto;
}
.op-pdf-viewer .op-pdf-stage canvas {
	display: block;
	max-width: 100%;
	height: auto;
	box-shadow: 0 1px 3px rgba(15, 23, 42, 0.12);
	background: var(--color-surface);
}
.op-pdf-viewer .op-pdf-status {
	margin: 0;
	padding: 2rem 1rem;
	text-align: center;
	color: var(--color-text-muted);
	font-size: 0.875rem;
}
.op-pdf-viewer .op-pdf-status a {
	color: var(--color-link);
}
.op-pdf-thumb {
	position: relative;
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	overflow: hidden;
	background: var(--color-surface-muted);
}
.op-pdf-thumb canvas {
	display: block;
	width: 100%;
	height: 100%;
	object-fit: cover;
	object-position: top center;
}
.op-pdf-thumb-fallback {
	display: none;
	align-items: center;
	justify-content: center;
	min-width: 3.5rem;
	padding: 0.35rem 0.75rem;
	border-radius: 0.375rem;
	background: var(--color-danger);
	color: var(--color-surface);
	font-size: 0.85rem;
	font-weight: 700;
	letter-spacing: 0.05em;
}
.op-pdf-thumb--error .op-pdf-thumb-fallback {
	display: inline-flex;
}
`;
