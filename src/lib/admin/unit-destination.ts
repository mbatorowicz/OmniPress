import type { SupabaseClient } from '@supabase/supabase-js';
import { encryptCredentialsFromForm } from './destinations';
import type { GitHubCredentials } from '@/lib/publish/credentials';
import { decryptDestinationCredentials } from '@/lib/publish/credentials';
import type { DestinationForPublish } from '@/lib/publish/types';

export function formFlag(form: FormData, key: string): boolean {
	return form.get(key) === 'on';
}

export async function loadStoredCredentials(
	supabase: SupabaseClient,
	destinationId: string,
): Promise<GitHubCredentials | null> {
	const { data } = await supabase
		.from('destinations')
		.select('id, name, type, config, encrypted_credentials, is_active')
		.eq('id', destinationId)
		.maybeSingle();
	if (!data) return null;
	return decryptDestinationCredentials(data as DestinationForPublish);
}

export async function upsertDestination(
	supabase: SupabaseClient,
	opts: {
		id: string | null;
		name: string;
		config: Record<string, unknown>;
		credentials: FormData;
	},
): Promise<{ id: string } | null> {
	const existingCreds = opts.id ? await loadStoredCredentials(supabase, opts.id) : null;
	const encrypted = await encryptCredentialsFromForm('github_astro', opts.credentials, existingCreds);
	const row: Record<string, unknown> = {
		name: opts.name,
		type: 'github_astro',
		config: opts.config,
		is_active: true,
	};
	if (encrypted) row.encrypted_credentials = encrypted;

	if (opts.id) {
		const { error } = await supabase.from('destinations').update(row).eq('id', opts.id);
		return error ? null : { id: opts.id };
	}

	const { data, error } = await supabase.from('destinations').insert(row).select('id').single();
	if (error || !data) return null;
	return { id: data.id as string };
}
