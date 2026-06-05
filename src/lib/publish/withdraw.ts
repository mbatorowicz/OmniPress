import type { SupabaseClient } from '@supabase/supabase-js';
import {
	decryptDestinationCredentials,
	isGitHubCredentials,
	isWordPressCredentials,
} from './credentials';
import { deleteGitHubFile, deleteGitHubFilesBatch, parseGitHubRepoConfig } from './github-api';
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

async function withdrawFromGitHubBatch(
	destination: DestinationForPublish,
	filePaths: string[],
): Promise<{ ok: true; summary: string } | { ok: false; summary: string }> {
	const cfg = parseGitHubRepoConfig(destination.config);
	if (!cfg) return { ok: false, summary: 'Brak repo w konfiguracji' };

	const creds = await decryptDestinationCredentials(destination);
	if (!creds || !isGitHubCredentials(destination.type, creds)) {
		return { ok: false, summary: 'Brak tokenu GitHub' };
	}

	const paths = filePaths.flatMap((id) => {
		const p = parseExternalGitHubPath(id);
		return p ? [p] : [];
	});
	if (paths.length === 0) return { ok: true, summary: 'Brak plików do usunięcia' };

	try {
		const result = await deleteGitHubFilesBatch(
			cfg,
			creds.token,
			paths,
			`OmniPress: zdejmij ${paths.length} wpis(ów) ze strony`,
		);
		if (!result) return { ok: true, summary: 'Pliki już usunięte z repo' };
		return {
			ok: true,
			summary: `Usunięto ${result.deleted} plik(ów) w jednym commicie (${result.commitSha.slice(0, 7)})`,
		};
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'GitHub: błąd batch delete';
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

type SuccessLog = {
	id: string;
	post_id: string;
	destination_id: string;
	external_id: string | null;
};

/** Zdejmuje wiele wpisów ze stron — GitHub: jeden commit na destynację. */
export async function withdrawPostsFromRemoteBatch(
	supabase: SupabaseClient,
	postIds: string[],
): Promise<WithdrawResult> {
	const uniqueIds = [...new Set(postIds.filter(Boolean))];
	if (uniqueIds.length === 0) return { remoteErrors: [], withdrawnCount: 0 };

	const { data: logs } = await supabase
		.from('publish_logs')
		.select('id, post_id, destination_id, external_id, status')
		.in('post_id', uniqueIds)
		.eq('status', 'success');

	const remoteErrors: string[] = [];
	const successLogs = (logs ?? []) as SuccessLog[];
	if (successLogs.length === 0) return { remoteErrors, withdrawnCount: 0 };

	const byDestination = new Map<string, SuccessLog[]>();
	for (const log of successLogs) {
		const list = byDestination.get(log.destination_id) ?? [];
		list.push(log);
		byDestination.set(log.destination_id, list);
	}

	for (const [destinationId, destLogs] of byDestination) {
		const destination = await loadDestinationForPublish(supabase, destinationId);
		if (!destination) {
			remoteErrors.push('Destynacja nie istnieje');
			continue;
		}

		const externalIds = destLogs.flatMap((l) => (l.external_id ? [l.external_id] : []));

		if (externalIds.length > 0) {
			const outcome =
				destination.type === 'github_astro'
					? await withdrawFromGitHubBatch(destination, externalIds)
					: destination.type === 'wordpress'
						? await (async () => {
								const errors: string[] = [];
								for (const extId of externalIds) {
									const r = await withdrawFromWordPress(destination, extId);
									if (!r.ok) errors.push(`${destination.name}: ${r.summary}`);
								}
								return errors.length
									? ({ ok: false as const, summary: errors.join('; ') })
									: ({ ok: true as const, summary: 'WordPress OK' });
							})()
						: { ok: false as const, summary: `Nieobsługiwany typ: ${destination.type}` };

			if (!outcome.ok) {
				remoteErrors.push(`${destination.name}: ${outcome.summary}`);
			}
		}
	}

	const logIds = successLogs.map((l) => l.id);
	await supabase.from('publish_logs').update({ status: 'withdrawn' }).in('id', logIds);

	return { remoteErrors, withdrawnCount: logIds.length };
}

/** Usuwa wpis ze stron docelowych (GitHub / WordPress) i oznacza logi jako withdrawn. */
export async function withdrawPostFromRemote(
	supabase: SupabaseClient,
	postId: string,
	_title: string,
): Promise<WithdrawResult> {
	return withdrawPostsFromRemoteBatch(supabase, [postId]);
}
