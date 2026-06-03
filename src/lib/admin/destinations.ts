import type { SupabaseClient } from '@supabase/supabase-js';
import type { DestinationType } from '@/lib/types';
import { canEncryptCredentials, encryptSecret } from '@/lib/crypto';

export type DestinationRow = {
	id: string;
	name: string;
	type: DestinationType;
	config: Record<string, unknown>;
	is_active: boolean;
};

export type WordPressConfig = {
	wp_rest_base: string;
};

export type GitHubAstroConfig = {
	repo: string;
	branch: string;
	content_path: string;
};

export function parseDestinationType(raw: string): DestinationType | null {
	if (raw === 'wordpress' || raw === 'github_astro') return raw;
	return null;
}

export function buildConfig(type: DestinationType, form: FormData): Record<string, unknown> {
	if (type === 'wordpress') {
		return { wp_rest_base: String(form.get('wp_rest_base') ?? '').trim() };
	}
	return {
		repo: String(form.get('repo') ?? '').trim(),
		branch: String(form.get('branch') ?? 'main').trim() || 'main',
		content_path: String(form.get('content_path') ?? 'src/content').trim() || 'src/content',
	};
}

export async function encryptCredentialsFromForm(
	type: DestinationType,
	form: FormData,
): Promise<string | null> {
	if (!canEncryptCredentials()) return null;

	if (type === 'wordpress') {
		const username = String(form.get('wp_username') ?? '').trim();
		const password = String(form.get('wp_app_password') ?? '').trim();
		if (!username || !password) return null;
		return encryptSecret(JSON.stringify({ username, application_password: password }));
	}

	const token = String(form.get('github_token') ?? '').trim();
	if (!token) return null;
	return encryptSecret(JSON.stringify({ token }));
}

export async function listDestinations(supabase: SupabaseClient): Promise<DestinationRow[]> {
	const { data } = await supabase
		.from('destinations')
		.select('id, name, type, config, is_active')
		.order('name');
	return (data ?? []) as DestinationRow[];
}

export async function getDestinationById(
	supabase: SupabaseClient,
	id: string,
): Promise<DestinationRow | null> {
	const { data } = await supabase
		.from('destinations')
		.select('id, name, type, config, is_active')
		.eq('id', id)
		.maybeSingle();
	return (data as DestinationRow | null) ?? null;
}
