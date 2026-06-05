export type CategoryOption = {
	slug: string;
	name: string;
	sources: ('github_astro')[];
};

export type CategoriesFetchResult =
	| { ok: true; categories: CategoryOption[] }
	| { ok: false; error: string };
