export type UnitError =
	| 'invalid_slug'
	| 'name_required'
	| 'no_channel'
	| 'config_repo'
	| 'site_failed'
	| 'destination_failed'
	| 'mapping_failed'
	| 'not_found';

export type UnitResult = { ok: true; siteId: string } | { ok: false; error: UnitError };

export type UnitFormInitial = {
	siteId: string;
	name: string;
	slug: string;
	is_active: boolean;
	enableAstro: boolean;
	astro?: {
		destinationId: string;
		repo: string;
		branch: string;
		content_path: string;
		content_layout: 'flat' | 'folder';
		layout_path: string;
		categories_path: string;
		navigation_path: string;
		recent_changes_path: string;
		vercel_project_id: string;
		vercel_team_id: string;
	};
};
