import type { SupabaseClient } from '@supabase/supabase-js';
import {
	decideReplaceMatch,
	extractPublicPath,
	pathSegments,
	type ReplaceCandidate,
	type ReplaceMatch,
	type ReplaceTargetKind,
} from './match-replace-model';

function asText(value: unknown): string {
	return typeof value === 'string' ? value : '';
}

function asId(value: unknown): string | null {
	return typeof value === 'string' && value ? value : null;
}

export async function siteIdBySlug(supabase: SupabaseClient, siteSlug: string): Promise<string | null> {
	const { data } = await supabase
		.from('sites')
		.select('id')
		.eq('slug', siteSlug.trim())
		.eq('is_active', true)
		.maybeSingle();
	return asId((data as { id?: unknown } | null)?.id);
}

function postCandidate(row: {
	id?: unknown;
	site_id?: unknown;
	title?: unknown;
}): ReplaceCandidate | null {
	const id = asId(row.id);
	const siteId = asId(row.site_id);
	if (!id || !siteId) return null;
	return { kind: 'post', id, siteId, title: asText(row.title) };
}

function pageCandidate(row: {
	id?: unknown;
	site_id?: unknown;
	title?: unknown;
}): ReplaceCandidate | null {
	const id = asId(row.id);
	const siteId = asId(row.site_id);
	if (!id || !siteId) return null;
	return { kind: 'page', id, siteId, title: asText(row.title) };
}

async function matchPostPath(
	supabase: SupabaseClient,
	siteId: string,
	segments: string[],
): Promise<ReplaceCandidate[]> {
	if (segments.length !== 2) return [];
	const { data } = await supabase
		.from('posts')
		.select('id, site_id, title')
		.eq('site_id', siteId)
		.eq('category_slug', segments[0])
		.eq('slug', segments[1])
		.maybeSingle();
	const hit = data ? postCandidate(data as { id?: unknown; site_id?: unknown; title?: unknown }) : null;
	return hit ? [hit] : [];
}

async function matchPagePath(
	supabase: SupabaseClient,
	siteId: string,
	segments: string[],
): Promise<ReplaceCandidate[]> {
	if (segments.length === 1) {
		const { data } = await supabase
			.from('site_pages')
			.select('id, site_id, title')
			.eq('site_id', siteId)
			.eq('path_prefix', '')
			.eq('slug', segments[0])
			.maybeSingle();
		const hit = data ? pageCandidate(data as { id?: unknown; site_id?: unknown; title?: unknown }) : null;
		return hit ? [hit] : [];
	}
	if (segments.length !== 2) return [];
	const { data } = await supabase
		.from('site_pages')
		.select('id, site_id, title')
		.eq('site_id', siteId)
		.eq('path_prefix', segments[0])
		.eq('slug', segments[1])
		.maybeSingle();
	const hit = data ? pageCandidate(data as { id?: unknown; site_id?: unknown; title?: unknown }) : null;
	return hit ? [hit] : [];
}

export async function matchByPath(
	supabase: SupabaseClient,
	siteId: string,
	hint: string,
): Promise<ReplaceMatch | null> {
	const path = extractPublicPath(hint);
	if (!path) return null;
	const segments = pathSegments(path);
	const hits = [
		...(await matchPostPath(supabase, siteId, segments)),
		...(await matchPagePath(supabase, siteId, segments)),
	];
	if (hits.length === 0) return null;
	return decideReplaceMatch(hits);
}

export async function ownerMeta(
	supabase: SupabaseClient,
	kind: ReplaceTargetKind,
	id: string,
): Promise<ReplaceCandidate | null> {
	if (kind === 'post') {
		const { data } = await supabase.from('posts').select('id, site_id, title').eq('id', id).maybeSingle();
		return data ? postCandidate(data as { id?: unknown; site_id?: unknown; title?: unknown }) : null;
	}
	const { data } = await supabase
		.from('site_pages')
		.select('id, site_id, title')
		.eq('id', id)
		.maybeSingle();
	return data ? pageCandidate(data as { id?: unknown; site_id?: unknown; title?: unknown }) : null;
}
