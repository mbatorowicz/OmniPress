export type { CategoryOption, CategoriesFetchResult } from './types';
export { mergeCategoryLists, findCategoryBySlug } from './merge';
export { loadDraftSiteCategories } from './site';
export { loadPublishedSiteCategories } from './published';
export { fetchAstroCategories } from './astro-github';
export {
	categoriesFromLayout,
	isLayoutInPublishedSync,
	publishedCategorySlugs,
} from './published-model';
export {
	detectCategorySlugRemaps,
	applyCategorySlugRemapsToLayout,
	type CategorySlugRemap,
} from './remap-model';
export { remapSitePostCategories } from './remap';
export {
	buildCategoryChecklistRows,
	buildCategoryChecklistSteps,
} from './checklist-model';
