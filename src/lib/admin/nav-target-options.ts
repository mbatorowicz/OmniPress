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
