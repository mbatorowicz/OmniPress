import type { UploadKind } from '@/lib/posts/upload-mime';
import type { UnpackDocxFn } from './unpack-docx';

export type InboundStoreRow = {
	filename: string;
	mime: string;
	kind: UploadKind;
	bytes: Uint8Array;
};

type DecidedStore = {
	filename: string;
	mime: string;
	kind: UploadKind;
};

/** DOCX bez pieczęci → same grafiki do galerii; inaczej grafiki + oryginał. */
export async function rowsToStore(
	decided: DecidedStore,
	bytes: Uint8Array,
	unpackDocx: UnpackDocxFn,
): Promise<InboundStoreRow[]> {
	const original: InboundStoreRow = {
		filename: decided.filename,
		mime: decided.mime,
		kind: decided.kind,
		bytes,
	};
	if (decided.kind !== 'docx') return [original];
	try {
		const unpacked = await unpackDocx(bytes, decided.filename);
		const images: InboundStoreRow[] = unpacked.images.map((img) => ({
			filename: img.filename,
			mime: img.mime,
			kind: 'gallery',
			bytes: img.bytes,
		}));
		if (unpacked.dropDocx && images.length > 0) return images;
		return [...images, original];
	} catch {
		return [original];
	}
}
