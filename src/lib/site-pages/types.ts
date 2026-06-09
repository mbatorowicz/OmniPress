export type PageStatus = 'draft' | 'published';

export type SitePage = {
	id: string;
	site_id: string;
	author_id: string;
	title: string;
	slug: string;
	path_prefix: string;
	content_md: string;
	status: PageStatus;
	external_id: string | null;
	created_at: string;
	updated_at: string;
};

export type SitePageForPublish = Pick<
	SitePage,
	'id' | 'site_id' | 'title' | 'slug' | 'path_prefix' | 'content_md' | 'external_id'
>;
