export type UploadProgressHandler = (fraction: number) => void;

/**
 * PUT na signed URL Storage — XHR, żeby mieć postęp bajtów.
 * To samo ciało i nagłówek co dotychczasowy `fetch` w `upload-asset`.
 */
export function putSignedUpload(
	signedUrl: string,
	body: FormData,
	onProgress?: UploadProgressHandler,
): Promise<void> {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.open('PUT', signedUrl);
		xhr.setRequestHeader('x-upsert', 'false');
		xhr.upload.onprogress = (event) => {
			if (!onProgress || !event.lengthComputable || event.total <= 0) return;
			onProgress(event.loaded / event.total);
		};
		xhr.onload = () => {
			if (xhr.status >= 200 && xhr.status < 300) {
				resolve();
				return;
			}
			reject(new Error('upload_failed'));
		};
		xhr.onerror = () => reject(new Error('network'));
		xhr.send(body);
	});
}

/** Skala 0–100: rezerwacja URL (5), PUT (5–95), zapis metadanych (95–100). */
export function uploadStagePercent(
	stage: 'url' | 'put' | 'complete' | 'done',
	putFraction = 0,
): number {
	if (stage === 'url') return 5;
	if (stage === 'put') return Math.round(5 + Math.min(1, Math.max(0, putFraction)) * 90);
	if (stage === 'complete') return 95;
	return 100;
}
