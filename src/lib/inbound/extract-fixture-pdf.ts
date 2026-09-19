/** Minimalny PDF 1.4 z jednym łańcuchem Helvetica — do testów pdf.js. */
export function pdfWithText(text: string): Uint8Array {
	const escaped = text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
	const stream = `BT /F1 24 Tf 72 720 Td (${escaped}) Tj ET`;
	const objects = [
		'1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n',
		'2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n',
		'3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n',
		`4 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream\nendobj\n`,
		'5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n',
	];
	let body = '%PDF-1.4\n';
	const offsets: number[] = [];
	for (const obj of objects) {
		offsets.push(body.length);
		body += obj;
	}
	const xrefStart = body.length;
	let xref = `xref\n0 6\n0000000000 65535 f \n`;
	for (const offset of offsets) {
		xref += `${String(offset).padStart(10, '0')} 00000 n \n`;
	}
	return new TextEncoder().encode(
		`${body}${xref}trailer << /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`,
	);
}
