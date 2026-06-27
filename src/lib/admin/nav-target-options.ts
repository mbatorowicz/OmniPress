import { STATIC_ROUTE_OPTIONS, type PageOption } from '@/lib/admin/link-options';

export type NavTargetOption = { value: string; label: string };

export type NavTargetOptions = {
	category: NavTargetOption[];
	page: NavTargetOption[];
	static: NavTargetOption[];
	emptyCategory: string;
	emptyPage: string;
};

export function buildNavTargetOptions(
	categoryPages: PageOption[],
	pageOptions: PageOption[],
	labels: { emptyCategory: string; emptyPage: string },
): NavTargetOptions {
	return {
		category: categoryPages.map((c) => ({
			value: c.path.replace(/^\//, ''),
			label: c.title,
		})),
		page: pageOptions.map((p) => ({ value: p.path, label: p.title })),
		static: STATIC_ROUTE_OPTIONS.map((o) => ({ value: o.path, label: o.title })),
		emptyCategory: labels.emptyCategory,
		emptyPage: labels.emptyPage,
	};
}

export function optionsForNavTargetKind(
	kind: string,
	options: NavTargetOptions,
): NavTargetOption[] {
	switch (kind) {
		case 'category':
			return options.category;
		case 'page':
			return options.page;
		case 'static':
			return options.static;
		default:
			return [];
	}
}

export type NavHrefKindLabels = {
	none: string;
	category: string;
	page: string;
	static: string;
	custom: string;
	external: string;
};

export function formatNavTargetSummary(
	kind: string,
	value: string,
	options: NavTargetOptions,
	hrefKindLabels: NavHrefKindLabels,
): string {
	if (kind === 'none') return hrefKindLabels.none;

	const kindLabel = hrefKindLabels[kind as keyof NavHrefKindLabels] ?? kind;

	if (kind === 'custom' || kind === 'external') {
		const trimmed = value.trim();
		return trimmed ? `${kindLabel} · ${trimmed}` : kindLabel;
	}

	const list = optionsForNavTargetKind(kind, options);
	const picked = list.length > 0 ? pickNavTargetValue(kind, value, list) : value.trim();
	const match = list.find((item) => item.value === picked);
	const targetLabel = match?.label ?? picked;
	return targetLabel ? `${kindLabel} · ${targetLabel}` : kindLabel;
}

export function pickNavTargetValue(
	kind: string,
	raw: string,
	list: NavTargetOption[],
): string {
	const trimmed = raw.trim();
	if (list.length === 0) return '';

	if (kind === 'category') {
		const slug = trimmed.replace(/^\//, '').split('/').filter(Boolean).pop() ?? trimmed;
		for (const candidate of [slug, trimmed.replace(/^\//, '')]) {
			const match = list.find((o) => o.value === candidate);
			if (match) return match.value;
		}
		return list[0]!.value;
	}

	if (trimmed) {
		const match = list.find((o) => o.value === trimmed);
		if (match) return match.value;
	}

	return list[0]!.value;
}
