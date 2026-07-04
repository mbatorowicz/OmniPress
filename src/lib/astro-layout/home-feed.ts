export const HOME_TILE_HEIGHT_MIN = 200;
export const HOME_TILE_HEIGHT_MAX = 600;

export function readHomeTileHeight(raw: unknown): number | undefined {
	const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw.trim()) : NaN;
	if (!Number.isFinite(n)) return undefined;
	const rounded = Math.floor(n);
	if (rounded < HOME_TILE_HEIGHT_MIN || rounded > HOME_TILE_HEIGHT_MAX) return undefined;
	return rounded;
}
