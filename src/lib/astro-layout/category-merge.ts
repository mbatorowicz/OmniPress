import { pruneCategoryDisplays } from './parse-form-categories';
import type { SiteAstroLayout } from './types';

/** Lista kategorii ze szkicu na aktualnym layoucie live — menu i widgety zostają ze strony. */
export function mergeDraftCategoriesOntoLive(
	live: SiteAstroLayout,
	draft: SiteAstroLayout,
): SiteAstroLayout {
	return {
		...live,
		categories: draft.categories,
		categoryDisplays: pruneCategoryDisplays(live, draft.categories),
	};
}
