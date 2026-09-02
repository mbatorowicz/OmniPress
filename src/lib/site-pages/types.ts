export type PageStatus = 'draft' | 'published';

export type SitePage = {
	id: string;
	site_id: string;
	/** Null po usunięciu konta autora (FK on delete set null). */
	author_id: string | null;
	title: string;
	slug: string;
	path_prefix: string;
	content_md: string;
	status: PageStatus;
	external_id: string | null;
	live_blob_sha: string | null;
	published_content_sha: string | null;
	created_at: string;
	updated_at: string;
};

export type SitePageForPublish = Pick<
	SitePage,
	'id' | 'site_id' | 'title' | 'slug' | 'path_prefix' | 'content_md' | 'external_id'
>;
