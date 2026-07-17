import type { SupabaseClient } from '@supabase/supabase-js';
import { decryptDestinationCredentials, isGitHubCredentials } from './credentials';
import {
	deleteGitHubFilesBatch,
	parseGitHubRepoConfig,
	resolveGitHubWithdrawPaths,
} from './github-api';
import { loadDestinationForPublish } from './dispatch';
import type { DestinationForPublish } from './types';

async function withdrawFromGitHubBatch(
	destination: DestinationForPublish,
	externalIds: string[],
): Promise<{ ok: true; summary: string } | { ok: false; summary: string }> {
	const cfg = parseGitHubRepoConfig(destination.config);
	if (!cfg) return { ok: false, summary: 'Brak repo w konfiguracji' };

	const creds = await decryptDestinationCredentials(destination);
	if (!creds || !isGitHubCredentials(destination.type, creds)) {
		return { ok: false, summary: 'Brak tokenu GitHub' };
	}

	if (externalIds.length === 0) return { ok: true, summary: 'Brak plików do usunięcia' };

	try {
		const paths = await resolveGitHubWithdrawPaths(cfg, creds.token, externalIds);
		if (paths.length === 0) return { ok: true, summary: 'Brak plików do usunięcia' };

		const result = await deleteGitHubFilesBatch(
			cfg,
			creds.token,
			paths,
			`OmniPress: zdejmij ${externalIds.length} wpis(ów) ze strony`,
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

async function postsWithLivePublishLogs(
	supabase: SupabaseClient,
	postIds: string[],
): Promise<boolean> {
	const { data } = await supabase
		.from('publish_logs')
		.select('id')
		.in('post_id', postIds)
		.eq('status', 'success')
		.limit(1);
	return Boolean(data?.length);
}

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

	const withdrawnLogIds: string[] = [];

	for (const [destinationId, destLogs] of byDestination) {
		const destination = await loadDestinationForPublish(supabase, destinationId);
		if (!destination) {
			remoteErrors.push('Destynacja nie istnieje');
			continue;
		}

		if (destination.type !== 'github_astro') {
			remoteErrors.push(`${destination.name}: nieobsługiwany typ ${destination.type}`);
			continue;
		}

		const externalIds = destLogs.flatMap((l) => (l.external_id ? [l.external_id] : []));
		if (externalIds.length === 0) continue;

		const outcome = await withdrawFromGitHubBatch(destination, externalIds);
		if (!outcome.ok) {
			remoteErrors.push(`${destination.name}: ${outcome.summary}`);
			continue;
		}

		withdrawnLogIds.push(...destLogs.map((l) => l.id));
	}

	if (withdrawnLogIds.length > 0) {
		await supabase.from('publish_logs').update({ status: 'withdrawn' }).in('id', withdrawnLogIds);
	}

	return { remoteErrors, withdrawnCount: withdrawnLogIds.length };
}

export { postsWithLivePublishLogs };

/** Usuwa wpis ze strony docelowej (GitHub) i oznacza logi jako withdrawn. */
export async function withdrawPostFromRemote(
	supabase: SupabaseClient,
	postId: string,
	_title: string,
): Promise<WithdrawResult> {
	return withdrawPostsFromRemoteBatch(supabase, [postId]);
}
