import { pruneCategoryDisplays } from './parse-form-categories';
import {
	applyCategorySlugRemapsToLayout,
	detectCategorySlugRemaps,
} from '@/lib/categories/remap-model';
import type { SiteAstroLayout } from './types';

/** Lista kategorii ze szkicu na aktualnym layoucie live — menu i widgety zostają ze strony. */
export function mergeDraftCategoriesOntoLive(
	live: SiteAstroLayout,
	draft: SiteAstroLayout,
): SiteAstroLayout {
	const remaps = detectCategorySlugRemaps(live.categories, draft.categories);
	const remapped = applyCategorySlugRemapsToLayout(live, remaps);
	return {
		...remapped,
		categories: draft.categories,
		categoryDisplays: pruneCategoryDisplays(remapped, draft.categories),
	};
}
