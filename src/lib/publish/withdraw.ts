import type { SupabaseClient } from '@supabase/supabase-js';
import {
	decryptDestinationCredentials,
	isGitHubCredentials,
	isWordPressCredentials,
} from './credentials';
import { deleteGitHubFile, parseGitHubRepoConfig } from './github-api';
import { loadDestinationForPublish } from './dispatch';
import { parseExternalGitHubPath } from './paths';
import type { DestinationForPublish } from './types';

function wpRestBase(config: Record<string, unknown>): string | null {
	const base = config.wp_rest_base;
	if (typeof base !== 'string' || !base.trim()) return null;
	return base.replace(/\/$/, '');
}

function basicAuthHeader(username: string, password: string): string {
	return `Basic ${btoa(`${username}:${password}`)}`;
}

async function withdrawFromGitHub(
	destination: DestinationForPublish,
	externalId: string,
	title: string,
): Promise<{ ok: true; summary: string } | { ok: false; summary: string }> {
	const cfg = parseGitHubRepoConfig(destination.config);
	if (!cfg) return { ok: false, summary: 'Brak repo w konfiguracji' };

	const creds = await decryptDestinationCredentials(destination);
	if (!creds || !isGitHubCredentials(destination.type, creds)) {
		return { ok: false, summary: 'Brak tokenu GitHub' };
	}

	const filePath = parseExternalGitHubPath(externalId);
	if (!filePath) return { ok: false, summary: 'Brak ścieżki pliku (external_id)' };

	try {
		const result = await deleteGitHubFile(cfg, creds.token, filePath, `OmniPress: usuń „${title}”`);
		if (!result) return { ok: true, summary: 'Plik już usunięty z repo' };
		return { ok: true, summary: `Usunięto z GitHub (${result.commitSha.slice(0, 7)})` };
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'GitHub: błąd usuwania';
		return { ok: false, summary: msg.slice(0, 300) };
	}
}

async function withdrawFromWordPress(
	destination: DestinationForPublish,
	externalId: string,
): Promise<{ ok: true; summary: string } | { ok: false; summary: string }> {
	const base = wpRestBase(destination.config);
	if (!base) return { ok: false, summary: 'Brak wp_rest_base' };

	const creds = await decryptDestinationCredentials(destination);
	if (!creds || !isWordPressCredentials(destination.type, creds)) {
		return { ok: false, summary: 'Brak credentials WP' };
	}

	const res = await fetch(`${base}/posts/${encodeURIComponent(externalId)}`, {
		method: 'DELETE',
		headers: {
			Authorization: basicAuthHeader(creds.username, creds.application_password),
		},
	});

	if (res.status === 404) {
		return { ok: true, summary: 'Wpis już usunięty z WordPress' };
	}

	const text = await res.text();
	if (!res.ok) {
		return { ok: false, summary: `WP HTTP ${res.status}: ${text.slice(0, 200)}` };
	}

	return { ok: true, summary: `Wpis #${externalId} przeniesiony do kosza WP` };
}

export type WithdrawResult = {
	remoteErrors: string[];
	withdrawnCount: number;
};

/** Usuwa wpis ze stron docelowych (GitHub / WordPress) i oznacza logi jako withdrawn. */
export async function withdrawPostFromRemote(
	supabase: SupabaseClient,
	postId: string,
	title: string,
): Promise<WithdrawResult> {
	const { data: logs } = await supabase
		.from('publish_logs')
		.select('id, destination_id, external_id, status')
		.eq('post_id', postId)
		.eq('status', 'success');

	const remoteErrors: string[] = [];
	let withdrawnCount = 0;

	for (const log of logs ?? []) {
		const destination = await loadDestinationForPublish(supabase, log.destination_id);
		if (!destination) {
			remoteErrors.push('Destynacja nie istnieje');
			await supabase.from('publish_logs').update({ status: 'withdrawn' }).eq('id', log.id);
			withdrawnCount++;
			continue;
		}

		if (log.external_id) {
			const outcome =
				destination.type === 'github_astro'
					? await withdrawFromGitHub(destination, log.external_id, title)
					: destination.type === 'wordpress'
						? await withdrawFromWordPress(destination, log.external_id)
						: { ok: false as const, summary: `Nieobsługiwany typ: ${destination.type}` };

			if (!outcome.ok) {
				remoteErrors.push(`${destination.name}: ${outcome.summary}`);
			}
		}

		await supabase.from('publish_logs').update({ status: 'withdrawn' }).eq('id', log.id);
		withdrawnCount++;
	}

	return { remoteErrors, withdrawnCount };
}
