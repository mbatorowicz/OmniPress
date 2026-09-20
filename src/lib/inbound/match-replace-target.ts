import type { SupabaseClient } from '@supabase/supabase-js';
import {
	decideReplaceMatch,
	sameFilename,
	storageBasename,
	titleLooksSpecific,
	type ReplaceCandidate,
	type ReplaceMatch,
} from './match-replace-model';
import { matchByPath, ownerMeta, siteIdBySlug } from './match-replace-query';

function asText(value: unknown): string {
	return typeof value === 'string' ? value : '';
}

function asId(value: unknown): string | null {
	return typeof value === 'string' && value ? value : null;
}

async function idsForSite(
	supabase: SupabaseClient,
	table: 'posts' | 'site_pages',
	siteId: string,
): Promise<string[]> {
	const { data } = await supabase.from(table).select('id').eq('site_id', siteId);
	return (data ?? [])
		.map((row) => asId((row as { id?: unknown }).id))
		.filter((id): id is string => Boolean(id));
}

async function assetsForOwner(
	supabase: SupabaseClient,
	column: 'post_id' | 'page_id',
	ids: string[],
): Promise<{ filename: string; storage_path: string; ownerId: string }[]> {
	if (ids.length === 0) return [];
	const { data } = await supabase
		.from('assets')
		.select(`filename, storage_path, ${column}`)
		.in(column, ids);
	return (data ?? [])
		.map((row) => {
			const rec = row as Record<string, unknown>;
			const ownerId = asId(rec[column]);
			if (!ownerId) return null;
			return {
				filename: asText(rec.filename),
				storage_path: asText(rec.storage_path),
				ownerId,
			};
		})
		.filter((row): row is { filename: string; storage_path: string; ownerId: string } => row !== null);
}

function filenameHits(
	wanted: string,
	rows: { filename: string; storage_path: string; ownerId: string }[],
): string[] {
	const needle = storageBasename(wanted);
	if (!needle) return [];
	return [
		...new Set(
			rows
				.filter(
					(row) => sameFilename(row.filename, wanted) || storageBasename(row.storage_path) === needle,
				)
				.map((row) => row.ownerId),
		),
	];
}

async function matchByFilename(
	supabase: SupabaseClient,
	siteId: string,
	filename: string,
): Promise<ReplaceMatch | null> {
	const name = filename.trim();
	if (!name) return null;
	const postIds = await idsForSite(supabase, 'posts', siteId);
	const pageIds = await idsForSite(supabase, 'site_pages', siteId);
	const postHits = filenameHits(name, await assetsForOwner(supabase, 'post_id', postIds));
	const pageHits = filenameHits(name, await assetsForOwner(supabase, 'page_id', pageIds));
	const candidates: ReplaceCandidate[] = [];
	for (const id of postHits) {
		const meta = await ownerMeta(supabase, 'post', id);
		if (meta) candidates.push({ ...meta, filename: name });
	}
	for (const id of pageHits) {
		const meta = await ownerMeta(supabase, 'page', id);
		if (meta) candidates.push({ ...meta, filename: name });
	}
	if (candidates.length === 0) return null;
	return decideReplaceMatch(candidates);
}

function filterTitleRows(
	hint: string,
	rows: { id?: unknown; site_id?: unknown; title?: unknown }[],
	kind: 'post' | 'page',
): ReplaceCandidate[] {
	const needle = hint.replace(/\s+/g, ' ').trim().toLowerCase();
	const exact: ReplaceCandidate[] = [];
	const partial: ReplaceCandidate[] = [];
	for (const row of rows) {
		const title = asText(row.title).replace(/\s+/g, ' ').trim();
		const id = asId(row.id);
		const siteId = asId(row.site_id);
		if (!id || !siteId || !title) continue;
		const candidate = { kind, id, siteId, title };
		if (title.toLowerCase() === needle) exact.push(candidate);
		else if (titleLooksSpecific(hint) && title.toLowerCase().includes(needle)) partial.push(candidate);
	}
	return exact.length > 0 ? exact : partial;
}

async function matchByTitle(
	supabase: SupabaseClient,
	siteId: string,
	hint: string,
): Promise<ReplaceMatch> {
	const { data: posts } = await supabase.from('posts').select('id, site_id, title').eq('site_id', siteId);
	const { data: pages } = await supabase
		.from('site_pages')
		.select('id, site_id, title')
		.eq('site_id', siteId);
	const hits = [
		...filterTitleRows(hint, (posts ?? []) as { id?: unknown; site_id?: unknown; title?: unknown }[], 'post'),
		...filterTitleRows(hint, (pages ?? []) as { id?: unknown; site_id?: unknown; title?: unknown }[], 'page'),
	];
	return decideReplaceMatch(hits);
}

/** Jeden pewny cel albo clarify. Zero Levenshteina. */
export async function matchReplaceTarget(
	supabase: SupabaseClient,
	siteSlug: string,
	hint: string,
	filename?: string | null,
): Promise<ReplaceMatch> {
	const siteId = await siteIdBySlug(supabase, siteSlug);
	if (!siteId) return { status: 'none' };
	const byPath = await matchByPath(supabase, siteId, hint);
	if (byPath) return byPath;
	const byFile = await matchByFilename(supabase, siteId, filename || hint);
	if (byFile) return byFile;
	return matchByTitle(supabase, siteId, hint);
}
