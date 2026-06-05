export type CategoryOption = {
	slug: string;
	name: string;
	wpCategoryId: number | null;
	sources: ('github_astro')[];
};

export type CategoriesFetchResult =
	| { ok: true; categories: CategoryOption[] }
	| { ok: false; error: string };
