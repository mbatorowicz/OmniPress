import { putSignedUpload, uploadStagePercent, type UploadProgressHandler } from './upload-xhr';

export type UploadKind = 'gallery' | 'pdf' | 'docx' | 'file';

export type UploadedAsset = {
	id: string;
	filename: string;
	mime_type: string;
	display_mode: string;
	sort_order: number;
	url: string;
};

export type UploadAssetResult =
	| { ok: true; asset: UploadedAsset; markdown: string | null }
	| { ok: false; error: string };

type UploadUrlResponse = {
	path?: string;
	signedUrl?: string;
	mime?: string;
	filename?: string;
	kind?: string;
	error?: string;
};

type UploadCompleteResponse = {
	asset?: UploadedAsset;
	markdown?: string | null;
	error?: string;
};

export type UploadAssetLabels = { uploadFailed: string; networkError: string };

export async function uploadPostAsset(
	postId: string,
	file: File,
	kind: UploadKind,
	labels: UploadAssetLabels,
	onProgress?: UploadProgressHandler,
): Promise<UploadAssetResult> {
	try {
		onProgress?.(uploadStagePercent('url') / 100);
		const urlRes = await fetch(`/api/posts/${postId}/upload-url`, {
			method: 'POST',
			credentials: 'same-origin',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				kind,
				filename: file.name,
				size: file.size,
				mimeType: file.type,
			}),
		});
		const urlData = (await urlRes.json()) as UploadUrlResponse;
		if (!urlRes.ok || !urlData.signedUrl || !urlData.path || !urlData.mime) {
			return { ok: false, error: urlData.error ?? labels.uploadFailed };
		}

		const typedFile = new File([file], file.name, { type: urlData.mime });
		const body = new FormData();
		body.append('cacheControl', '3600');
		body.append('', typedFile, file.name);
		try {
			await putSignedUpload(urlData.signedUrl, body, (fraction) => {
				onProgress?.(uploadStagePercent('put', fraction) / 100);
			});
		} catch (err) {
			const network = err instanceof Error && err.message === 'network';
			return { ok: false, error: network ? labels.networkError : labels.uploadFailed };
		}

		onProgress?.(uploadStagePercent('complete') / 100);
		const completeRes = await fetch(`/api/posts/${postId}/upload-complete`, {
			method: 'POST',
			credentials: 'same-origin',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				kind: urlData.kind ?? kind,
				path: urlData.path,
				filename: urlData.filename ?? file.name,
				mime: urlData.mime,
				size: file.size,
			}),
		});
		const completeData = (await completeRes.json()) as UploadCompleteResponse;
		if (!completeRes.ok || !completeData.asset) {
			return { ok: false, error: completeData.error ?? labels.uploadFailed };
		}

		onProgress?.(uploadStagePercent('done') / 100);
		return {
			ok: true,
			asset: completeData.asset,
			markdown: completeData.markdown ?? null,
		};
	} catch {
		return { ok: false, error: labels.networkError };
	}
}
