export const IMAGE_MAX_EDGE = 1920;
export const IMAGE_WEBP_QUALITY = 80;

const OPTIMIZABLE_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function shouldOptimizeImage(mime: string): boolean {
	return OPTIMIZABLE_IMAGE_MIME.has(mime.trim().toLowerCase());
}

export function fitInside(
	width: number,
	height: number,
	maxEdge: number,
): { width: number; height: number } {
	if (width <= 0 || height <= 0) return { width: 1, height: 1 };
	const longest = Math.max(width, height);
	if (longest <= maxEdge) return { width, height };
	const scale = maxEdge / longest;
	return {
		width: Math.max(1, Math.round(width * scale)),
		height: Math.max(1, Math.round(height * scale)),
	};
}

export function replaceStorageExtension(path: string, ext: string): string {
	const safeExt = ext.replace(/[^a-z0-9]/gi, '') || 'bin';
	const slash = path.lastIndexOf('/');
	const dir = slash >= 0 ? path.slice(0, slash + 1) : '';
	const base = slash >= 0 ? path.slice(slash + 1) : path;
	const dot = base.lastIndexOf('.');
	const name = dot > 0 ? base.slice(0, dot) : base;
	return `${dir}${name}.${safeExt}`;
}
