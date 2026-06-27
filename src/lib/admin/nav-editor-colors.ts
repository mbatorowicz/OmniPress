export type NavEditorDepthColor = {
	accent: string;
};

export type NavEditorDepthColors = [NavEditorDepthColor, NavEditorDepthColor, NavEditorDepthColor];

export type NavEditorDepthCssVars = {
	border: string;
	surface: string;
	text: string;
	muted: string;
	badgeBg: string;
	badgeBorder: string;
	actionDanger: string;
};

export const DEFAULT_NAV_EDITOR_DEPTH_COLORS: NavEditorDepthColors = [
	{ accent: '#1e4d7b' },
	{ accent: '#7dd3fc' },
	{ accent: '#c4b5fd' },
];

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function normalizeHexColor(raw: string, fallback: string): string {
	const trimmed = raw.trim();
	return HEX_COLOR.test(trimmed) ? trimmed.toLowerCase() : fallback;
}

function parseHexRgb(hex: string): [number, number, number] {
	const normalized = normalizeHexColor(hex, '#000000');
	return [
		Number.parseInt(normalized.slice(1, 3), 16),
		Number.parseInt(normalized.slice(3, 5), 16),
		Number.parseInt(normalized.slice(5, 7), 16),
	];
}

function relativeLuminance(hex: string): number {
	const [r, g, b] = parseHexRgb(hex).map((channel) => {
		const srgb = channel / 255;
		return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

export function pickContrastText(accent: string): '#ffffff' | '#0f172a' {
	return relativeLuminance(accent) > 0.45 ? '#0f172a' : '#ffffff';
}

function mixHex(fg: string, bg: string, fgWeight: number): string {
	const [fr, fgG, fb] = parseHexRgb(fg);
	const [br, bgG, bb] = parseHexRgb(bg);
	const w = Math.min(1, Math.max(0, fgWeight));
	const mix = (a: number, b: number) => Math.round(a * w + b * (1 - w));
	const toHex = (value: number) => value.toString(16).padStart(2, '0');
	return `#${toHex(mix(fr, br))}${toHex(mix(fgG, bgG))}${toHex(mix(fb, bb))}`;
}

export function expandNavEditorDepthColor(accent: string): NavEditorDepthCssVars {
	const normalized = normalizeHexColor(accent, DEFAULT_NAV_EDITOR_DEPTH_COLORS[0].accent);
	const text = pickContrastText(normalized);
	const onDark = text === '#ffffff';
	return {
		border: normalized,
		surface: normalized,
		text,
		muted: mixHex(text, normalized, onDark ? 0.82 : 0.76),
		badgeBg: mixHex(text, normalized, onDark ? 0.2 : 0.12),
		badgeBorder: mixHex(text, normalized, onDark ? 0.48 : 0.34),
		actionDanger: onDark ? '#fca5a5' : '#dc2626',
	};
}

function normalizeAccentItem(
	item: NavEditorDepthColor | Record<string, unknown> | undefined,
	fallback: NavEditorDepthColor,
): NavEditorDepthColor {
	if (!item || typeof item !== 'object') return fallback;
	if ('accent' in item && typeof item.accent === 'string') {
		return { accent: normalizeHexColor(item.accent, fallback.accent) };
	}
	const legacy = item as { border?: string; surface?: string; text?: string };
	const legacyAccent = legacy.surface || legacy.border || legacy.text;
	if (typeof legacyAccent === 'string') {
		return { accent: normalizeHexColor(legacyAccent, fallback.accent) };
	}
	return fallback;
}

export function resolveNavEditorDepthColors(
	raw: NavEditorDepthColors | undefined,
): NavEditorDepthColors {
	return DEFAULT_NAV_EDITOR_DEPTH_COLORS.map((defaults, index) =>
		normalizeAccentItem(raw?.[index], defaults),
	) as NavEditorDepthColors;
}

export function parseNavEditorDepthColorsFromForm(form: FormData): NavEditorDepthColors {
	return DEFAULT_NAV_EDITOR_DEPTH_COLORS.map((defaults, depth) => {
		const accent = String(form.get(`nav_editor_depth_${depth}_accent`) ?? '');
		if (accent.trim()) {
			return { accent: normalizeHexColor(accent, defaults.accent) };
		}
		const legacySurface = String(form.get(`nav_editor_depth_${depth}_surface`) ?? '');
		const legacyBorder = String(form.get(`nav_editor_depth_${depth}_border`) ?? '');
		const legacy = legacySurface || legacyBorder;
		return { accent: normalizeHexColor(legacy, defaults.accent) };
	}) as NavEditorDepthColors;
}

function cssVarsForDepth(depth: number, accent: string): string {
	const vars = expandNavEditorDepthColor(accent);
	return [
		`--nav-editor-depth-${depth}-border:${vars.border}`,
		`--nav-editor-depth-${depth}-surface:${vars.surface}`,
		`--nav-editor-depth-${depth}-text:${vars.text}`,
		`--nav-editor-depth-${depth}-text-muted:${vars.muted}`,
		`--nav-editor-depth-${depth}-badge-bg:${vars.badgeBg}`,
		`--nav-editor-depth-${depth}-badge-border:${vars.badgeBorder}`,
		`--nav-editor-depth-${depth}-action-danger:${vars.actionDanger}`,
	].join(';');
}

export function navEditorDepthColorsToStyle(colors: NavEditorDepthColors): string {
	return colors.map((item, depth) => cssVarsForDepth(depth, item.accent)).join(';');
}

export function applyNavEditorDepthAccentToElement(
	element: HTMLElement,
	depth: number,
	accent: string,
): void {
	const vars = expandNavEditorDepthColor(accent);
	element.style.setProperty(`--nav-editor-depth-${depth}-border`, vars.border);
	element.style.setProperty(`--nav-editor-depth-${depth}-surface`, vars.surface);
	element.style.setProperty(`--nav-editor-depth-${depth}-text`, vars.text);
	element.style.setProperty(`--nav-editor-depth-${depth}-text-muted`, vars.muted);
	element.style.setProperty(`--nav-editor-depth-${depth}-badge-bg`, vars.badgeBg);
	element.style.setProperty(`--nav-editor-depth-${depth}-badge-border`, vars.badgeBorder);
	element.style.setProperty(`--nav-editor-depth-${depth}-action-danger`, vars.actionDanger);
}

export function applyNavEditorDepthColorsToElement(
	element: HTMLElement,
	colors: NavEditorDepthColors,
): void {
	for (const [depth, item] of colors.entries()) {
		applyNavEditorDepthAccentToElement(element, depth, item.accent);
	}
}
