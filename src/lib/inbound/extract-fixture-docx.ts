import { zipStore } from './extract-fixture-zip';

function xml(text: string): Uint8Array {
	return new TextEncoder().encode(text);
}

function docxParts(text: string, extra: { name: string; data: Uint8Array }[] = []) {
	const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	const jpeg = extra.some((f) => f.name.toLowerCase().endsWith('.jpeg') || f.name.toLowerCase().endsWith('.jpg'));
	const jpegDefault = jpeg
		? `<Default Extension="jpeg" ContentType="image/jpeg"/>`
		: '';
	return [
		{
			name: '[Content_Types].xml',
			data: xml(
				`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
					`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
					`<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
					`<Default Extension="xml" ContentType="application/xml"/>` +
					jpegDefault +
					`<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
					`</Types>`,
			),
		},
		{
			name: '_rels/.rels',
			data: xml(
				`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
					`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
					`<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
					`</Relationships>`,
			),
		},
		{
			name: 'word/_rels/document.xml.rels',
			data: xml(
				`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
					`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`,
			),
		},
		{
			name: 'word/document.xml',
			data: xml(
				`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
					`<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
					`<w:body><w:p><w:r><w:t>${escaped}</w:t></w:r></w:p></w:body></w:document>`,
			),
		},
		...extra,
	];
}

/** Minimalny DOCX (ZIP store) z jednym akapitem. */
export function docxWithText(text: string): Uint8Array {
	return zipStore(docxParts(text));
}

/** DOCX z plikiem w `word/media`. */
export function docxWithMedia(text: string, name: string, data: Uint8Array): Uint8Array {
	return zipStore(docxParts(text, [{ name: `word/media/${name}`, data }]));
}
