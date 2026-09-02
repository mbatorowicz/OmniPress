import type { SupabaseClient } from '@supabase/supabase-js';

export function shouldSkipReconcile(
	storedSha: string | null | undefined,
	liveHeadSha: string,
): boolean {
	return Boolean(storedSha && storedSha === liveHeadSha);
}

export async function loadSiteReconcileSha(
	supabase: SupabaseClient,
	siteId: string,
): Promise<string | null> {
	const { data } = await supabase
		.from('sites')
		.select('github_reconcile_sha')
		.eq('id', siteId)
		.maybeSingle();
	const sha = (data as { github_reconcile_sha?: string | null } | null)?.github_reconcile_sha;
	return sha?.trim() || null;
}

export async function saveSiteReconcileSha(
	supabase: SupabaseClient,
	siteId: string,
	headSha: string,
): Promise<void> {
	await supabase
		.from('sites')
		.update({
			github_reconcile_sha: headSha,
			github_reconciled_at: new Date().toISOString(),
		})
		.eq('id', siteId);
}
