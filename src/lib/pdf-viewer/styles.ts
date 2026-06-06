export const PDF_VIEWER_CSS = `
.op-pdf-viewer {
	margin: 1.25rem 0;
	border: 1px solid #e2e8f0;
	border-radius: 0.5rem;
	overflow: hidden;
	background: #f8fafc;
	isolation: isolate;
}
.op-pdf-viewer .op-pdf-toolbar {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 0.5rem;
	padding: 0.5rem 0.75rem;
	background: #fff;
	border-bottom: 1px solid #e2e8f0;
	color: #334155;
	font-size: 0.875rem;
	line-height: 1.4;
}
.op-pdf-viewer .op-pdf-toolbar button,
.op-pdf-viewer .op-pdf-toolbar a {
	padding: 0.25rem 0.625rem;
	border: 1px solid #cbd5e1;
	border-radius: 0.375rem;
	background: #f8fafc;
	color: #334155;
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
	background: #e2e8f0;
}
.op-pdf-viewer .op-pdf-page-info {
	min-width: 5.5rem;
	text-align: center;
	color: #64748b;
}
.op-pdf-viewer .op-pdf-stage {
	display: flex;
	justify-content: center;
	align-items: flex-start;
	padding: 1rem;
	background: #f1f5f9;
	min-height: 18rem;
	max-height: 75vh;
	overflow: auto;
}
.op-pdf-viewer .op-pdf-stage canvas {
	display: block;
	max-width: 100%;
	height: auto;
	box-shadow: 0 1px 3px rgba(15, 23, 42, 0.12);
	background: #fff;
}
.op-pdf-viewer .op-pdf-status {
	margin: 0;
	padding: 2rem 1rem;
	text-align: center;
	color: #64748b;
	font-size: 0.875rem;
}
.op-pdf-viewer .op-pdf-status a {
	color: #1d4ed8;
}
`;
