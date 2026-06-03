export type UserRole = 'editor' | 'admin';

export type PostStatus = 'draft' | 'pending' | 'published' | 'rejected';

export type DestinationType = 'wordpress' | 'github_astro';

export type PublishLogStatus = 'pending' | 'success' | 'failed' | 'withdrawn';

export interface Profile {
	id: string;
	role: UserRole;
	display_name: string | null;
	default_site_id: string | null;
	created_at: string;
	updated_at: string;
}

export interface Site {
	id: string;
	name: string;
	slug: string;
	is_active: boolean;
	created_at: string;
}
