import { describe, expect, it } from 'vitest';
import {
	DOCX_MIME,
	GPKG_MIME,
	XLSX_MIME,
	ZIP_MIME,
	extensionForMime,
	markdownForUploadedAsset,
	matchesPostAssetMagicBytes,
	resolveUploadMime,
	validatePostAssetFile,
	validateUploadMeta,
} from './upload';

// `BlobPart` wymaga widoku nad ArrayBuffer — goły `Uint8Array` obejmuje też SharedArrayBuffer.
function sqliteGpkgBytes(): Uint8Array<ArrayBuffer> {
	const bytes = new Uint8Array(16);
	const magic = 'SQLite format 3';
	for (let i = 0; i < 15; i++) bytes[i] = magic.charCodeAt(i);
	bytes[15] = 0;
	return bytes;
}

function zipLocalHeader(): Uint8Array<ArrayBuffer> {
	return new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
}

describe('validatePostAssetFile', () => {
	it('akceptuje PDF z poprawnym nagłówkiem', async () => {
		const file = new File(['%PDF-1.4'], 'ostrzezenie.pdf', { type: 'application/pdf' });
		expect(await validatePostAssetFile(file)).toBeNull();
	});

	it('odrzuca PDF z fałszywym MIME', async () => {
		const file = new File(['not-a-pdf'], 'fake.pdf', { type: 'application/pdf' });
		expect(await validatePostAssetFile(file)).toBeTruthy();
	});

	it('odrzuca nieznany typ', async () => {
		const file = new File(['x'], 'doc.txt', { type: 'text/plain' });
		expect(await validatePostAssetFile(file)).toBeTruthy();
	});

	it('akceptuje DOCX z poprawnym nagłówkiem ZIP', async () => {
		const file = new File([zipLocalHeader()], 'plan.docx', {
			type: DOCX_MIME,
		});
		expect(await validatePostAssetFile(file)).toBeNull();
	});

	it('akceptuje XLSX z poprawnym nagłówkiem ZIP', async () => {
		const file = new File([zipLocalHeader()], 'tabela.xlsx', {
			type: XLSX_MIME,
		});
		expect(await validatePostAssetFile(file)).toBeNull();
	});

	it('akceptuje ZIP z poprawnym nagłówkiem', async () => {
		const file = new File([zipLocalHeader()], 'zalaczniki.zip', {
			type: 'application/x-zip-compressed',
		});
		expect(await validatePostAssetFile(file)).toBeNull();
	});

	it('akceptuje GPKG z nagłówkiem SQLite mimo octet-stream', async () => {
		const file = new File([sqliteGpkgBytes()], 'mapa.gpkg', {
			type: 'application/octet-stream',
		});
		expect(await validatePostAssetFile(file)).toBeNull();
	});
});

describe('resolveUploadMime', () => {
	it('normalizuje GPKG z pustego typu', () => {
		expect(resolveUploadMime('warstwa.gpkg', '')).toBe(GPKG_MIME);
	});

	it('odrzuca GPKG z obcym MIME', () => {
		expect(resolveUploadMime('warstwa.gpkg', 'image/png')).toBeNull();
	});

	it('normalizuje XLSX z octet-stream', () => {
		expect(resolveUploadMime('dane.xlsx', 'application/octet-stream')).toBe(XLSX_MIME);
	});

	it('normalizuje ZIP z application/x-zip-compressed', () => {
		expect(resolveUploadMime('archiwum.zip', 'application/x-zip-compressed')).toBe(ZIP_MIME);
	});

	it('odrzuca ZIP z obcym MIME', () => {
		expect(resolveUploadMime('archiwum.zip', 'image/png')).toBeNull();
	});
});

describe('validateUploadMeta', () => {
	it('akceptuje plik do pobrania (kind=file) do 50 MB', () => {
		const result = validateUploadMeta('file', 'a.gpkg', 40 * 1024 * 1024, GPKG_MIME);
		expect(result).toEqual({ mime: GPKG_MIME });
	});

	it('akceptuje XLSX w kind=file', () => {
		const result = validateUploadMeta('file', 'a.xlsx', 1024, XLSX_MIME);
		expect(result).toEqual({ mime: XLSX_MIME });
	});

	it('akceptuje ZIP w kind=file', () => {
		const result = validateUploadMeta('file', 'a.zip', 1024, ZIP_MIME);
		expect(result).toEqual({ mime: ZIP_MIME });
	});

	it('odrzuca DOCX w kind=file', () => {
		const result = validateUploadMeta('file', 'a.docx', 1024, DOCX_MIME);
		expect('error' in result).toBe(true);
	});

	it('odrzuca plik powyżej 50 MB', () => {
		const result = validateUploadMeta('pdf', 'duzy.pdf', 51 * 1024 * 1024, 'application/pdf');
		expect('error' in result).toBe(true);
	});
});

describe('matchesPostAssetMagicBytes', () => {
	it('rozpoznaje JPEG', () => {
		expect(matchesPostAssetMagicBytes(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), 'image/jpeg')).toBe(
			true,
		);
	});

	it('rozpoznaje GPKG / SQLite', () => {
		expect(matchesPostAssetMagicBytes(sqliteGpkgBytes(), GPKG_MIME)).toBe(true);
	});

	it('rozpoznaje ZIP / XLSX (kontener ZIP)', () => {
		expect(matchesPostAssetMagicBytes(zipLocalHeader(), ZIP_MIME)).toBe(true);
		expect(matchesPostAssetMagicBytes(zipLocalHeader(), XLSX_MIME)).toBe(true);
	});
});

describe('markdownForUploadedAsset', () => {
	it('generuje link dla PDF', () => {
		const md = markdownForUploadedAsset('MZW.pdf', 'https://example.com/x.pdf', 'application/pdf');
		expect(md).toContain('[📄 MZW.pdf]');
		expect(md).toContain('https://example.com/x.pdf');
	});

	it('generuje link dla DOCX', () => {
		const md = markdownForUploadedAsset('plan.docx', 'https://example.com/x.docx', DOCX_MIME);
		expect(md).toContain('[📎 plan.docx]');
		expect(md).toContain('https://example.com/x.docx');
	});

	it('generuje link dla GPKG', () => {
		const md = markdownForUploadedAsset('mapa.gpkg', 'https://example.com/x.gpkg', GPKG_MIME);
		expect(md).toContain('[📎 mapa.gpkg]');
		expect(md).toContain('https://example.com/x.gpkg');
	});

	it('generuje link dla XLSX', () => {
		const md = markdownForUploadedAsset('dane.xlsx', 'https://example.com/x.xlsx', XLSX_MIME);
		expect(md).toContain('[📎 dane.xlsx]');
	});

	it('generuje link dla ZIP', () => {
		const md = markdownForUploadedAsset('pakiet.zip', 'https://example.com/x.zip', ZIP_MIME);
		expect(md).toContain('[📎 pakiet.zip]');
	});

	it('generuje obrazek dla JPEG', () => {
		const md = markdownForUploadedAsset('foto.jpg', 'https://example.com/x.jpg', 'image/jpeg');
		expect(md).toBe('![foto.jpg](https://example.com/x.jpg)');
	});

	it('mapuje rozszerzenie pdf', () => {
		expect(extensionForMime('application/pdf')).toBe('pdf');
	});

	it('mapuje rozszerzenie docx', () => {
		expect(extensionForMime(DOCX_MIME)).toBe('docx');
	});

	it('mapuje rozszerzenie gpkg', () => {
		expect(extensionForMime(GPKG_MIME)).toBe('gpkg');
	});

	it('mapuje rozszerzenie xlsx i zip', () => {
		expect(extensionForMime(XLSX_MIME)).toBe('xlsx');
		expect(extensionForMime(ZIP_MIME)).toBe('zip');
	});
});
