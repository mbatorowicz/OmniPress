import {
	IMAGE_MAX_EDGE,
	IMAGE_WEBP_QUALITY,
	fitInside,
	shouldOptimizeImage,
} from '@/lib/posts/optimize-image-model';

function canvasToWebp(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
	return new Promise((resolve) => {
		canvas.toBlob((blob) => resolve(blob), 'image/webp', quality);
	});
}

/** Przeglądarka: zmniejsza zdjęcie przed signed PUT, żeby complete nie ściągał 10 MB. */
export async function prepareImageForUpload(file: File): Promise<File> {
	if (!shouldOptimizeImage(file.type)) return file;
	if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') {
		return file;
	}

	try {
		const bitmap = await createImageBitmap(file);
		const fitted = fitInside(bitmap.width, bitmap.height, IMAGE_MAX_EDGE);
		const needsResize = fitted.width !== bitmap.width || fitted.height !== bitmap.height;
		if (file.type === 'image/webp' && !needsResize) {
			bitmap.close();
			return file;
		}

		const canvas = document.createElement('canvas');
		canvas.width = fitted.width;
		canvas.height = fitted.height;
		const ctx = canvas.getContext('2d');
		if (!ctx) {
			bitmap.close();
			return file;
		}
		ctx.drawImage(bitmap, 0, 0, fitted.width, fitted.height);
		bitmap.close();

		const blob = await canvasToWebp(canvas, IMAGE_WEBP_QUALITY / 100);
		if (!blob) return file;
		if (blob.size >= file.size && !needsResize) return file;

		return new File([blob], file.name, { type: 'image/webp', lastModified: file.lastModified });
	} catch {
		return file;
	}
}
