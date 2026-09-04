import { DOCX_MIME, GPKG_MIME, PDF_MIME, XLSX_MIME, ZIP_MIME } from './upload-mime';

const SQLITE_MAGIC = 'SQLite format 3';

export function isZipContainerMagic(bytes: Uint8Array): boolean {
	if (bytes.length < 4) return false;
	if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) return false;
	return (
		(bytes[2] === 0x03 && bytes[3] === 0x04) ||
		(bytes[2] === 0x05 && bytes[3] === 0x06) ||
		(bytes[2] === 0x07 && bytes[3] === 0x08)
	);
}

export function matchesMagicBytes(bytes: Uint8Array, mime: string): boolean {
	if (mime === 'image/jpeg') {
		return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
	}
	if (mime === 'image/png') {
		return (
			bytes.length >= 4 &&
			bytes[0] === 0x89 &&
			bytes[1] === 0x50 &&
			bytes[2] === 0x4e &&
			bytes[3] === 0x47
		);
	}
	if (mime === 'image/gif') {
		return (
			bytes.length >= 4 &&
			bytes[0] === 0x47 &&
			bytes[1] === 0x49 &&
			bytes[2] === 0x46 &&
			bytes[3] === 0x38
		);
	}
	if (mime === 'image/webp') {
		return (
			bytes.length >= 12 &&
			bytes[0] === 0x52 &&
			bytes[1] === 0x49 &&
			bytes[2] === 0x46 &&
			bytes[3] === 0x46 &&
			bytes[8] === 0x57 &&
			bytes[9] === 0x45 &&
			bytes[10] === 0x42 &&
			bytes[11] === 0x50
		);
	}
	if (mime === PDF_MIME) {
		return (
			bytes.length >= 4 &&
			bytes[0] === 0x25 &&
			bytes[1] === 0x50 &&
			bytes[2] === 0x44 &&
			bytes[3] === 0x46
		);
	}
	if (mime === DOCX_MIME || mime === XLSX_MIME || mime === ZIP_MIME) {
		return isZipContainerMagic(bytes);
	}
	if (mime === GPKG_MIME) {
		if (bytes.length < 16) return false;
		const header = String.fromCharCode(...bytes.subarray(0, 15));
		return header === SQLITE_MAGIC && bytes[15] === 0;
	}
	return false;
}

export function validateMagicBytesForMime(bytes: Uint8Array, mime: string): boolean {
	return matchesMagicBytes(bytes, mime);
}

/** Testy jednostkowe — weryfikacja magic bytes bez File API. */
export function matchesPostAssetMagicBytes(bytes: Uint8Array, mime: string): boolean {
	return matchesMagicBytes(bytes, mime);
}
