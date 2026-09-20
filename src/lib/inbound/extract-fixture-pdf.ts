/** Minimalny PDF 1.4 z Helvetica — do testów pdf.js. */

function escapePdfText(text: string): string {
	return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function contentStream(text: string): string {
	const stream = `BT /F1 24 Tf 72 720 Td (${escapePdfText(text)}) Tj ET`;
	return `<< /Length ${stream.length} >> stream\n${stream}\nendstream\n`;
}

export function pdfWithPages(texts: string[]): Uint8Array {
	const pages = texts.length > 0 ? texts : [''];
	const n = pages.length;
	const fontObj = 3;
	const ordered: string[] = [
		'1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n',
		`2 0 obj << /Type /Pages /Kids [${pages
			.map((_, i) => `${4 + i * 2} 0 R`)
			.join(' ')}] /Count ${n} >> endobj\n`,
		`${fontObj} 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n`,
	];
	for (let i = 0; i < n; i += 1) {
		const pageObj = 4 + i * 2;
		const contentObj = pageObj + 1;
		ordered.push(
			`${pageObj} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentObj} 0 R /Resources << /Font << /F1 ${fontObj} 0 R >> >> >> endobj\n`,
			`${contentObj} 0 obj ${contentStream(pages[i] ?? '')}endobj\n`,
		);
	}
	let body = '%PDF-1.4\n';
	const offsets: number[] = [];
	for (const obj of ordered) {
		offsets.push(body.length);
		body += obj;
	}
	const size = ordered.length + 1;
	const xrefStart = body.length;
	let xref = `xref\n0 ${size}\n0000000000 65535 f \n`;
	for (const offset of offsets) {
		xref += `${String(offset).padStart(10, '0')} 00000 n \n`;
	}
	return new TextEncoder().encode(
		`${body}${xref}trailer << /Size ${size} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`,
	);
}

export function pdfWithText(text: string): Uint8Array {
	return pdfWithPages([text]);
}
