import { parseNavigationJson } from './parse';
import { ASTRO_DISPLAY_SLOTS, defaultCategoryDisplays } from './slots';
import type { CategoryDefinition, SiteAstroLayout } from './types';

export function parseLayoutFromFormData(
	form: FormData,
	base: Pick<SiteAstroLayout, 'navigationPath' | 'categoriesPath'>,
): { ok: true; layout: SiteAstroLayout } | { ok: false; error: string } {
	const navText = String(form.get('navigation_json') ?? '').trim();
	if (!navText) return { ok: false, error: 'invalid_navigation' };

	let navigation;
	try {
		navigation = parseNavigationJson(navText);
	} catch {
		return { ok: false, error: 'invalid_navigation' };
	}

	const slugs = form.getAll('category_slug').map((v) => String(v).trim());
	const names = form.getAll('category_name').map((v) => String(v).trim());
	const categories: CategoryDefinition[] = [];

	for (let i = 0; i < slugs.length; i++) {
		const slug = slugs[i];
		const name = names[i] ?? '';
		if (!slug || !name) continue;
		categories.push({ slug, name });
	}

	if (categories.length === 0) return { ok: false, error: 'no_categories' };

	const categoryDisplays = defaultCategoryDisplays();
	for (const slot of ASTRO_DISPLAY_SLOTS) {
		categoryDisplays[slot.id] = categories
			.filter((c) => form.get(`display_${slot.id}_${c.slug}`) === 'on')
			.map((c) => c.slug);
	}

	return {
		ok: true,
		layout: {
			navigation,
			categories,
			categoryDisplays,
			navigationPath: base.navigationPath,
			categoriesPath: base.categoriesPath,
		},
	};
}
