import { APP } from '@/config/app';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ReplaceTargetKind = 'post' | 'page';

export type ReplaceCandidate = {
	kind: ReplaceTargetKind;
	id: string;
	siteId: string;
	title: string;
	filename?: string;
};

export type ReplaceMatch =
	| { status: 'exact'; candidate: ReplaceCandidate }
	| { status: 'ambiguous'; candidates: ReplaceCandidate[] }
	| { status: 'none' };

export function inboundPostPanelUrl(postId: string): string {
	return `${APP.productionOrigin}/admin/posts/${postId}`;
}

export function inboundPagePanelUrl(siteId: string, pageId: string): string {
	return `${APP.productionOrigin}/admin/units/${siteId}/pages/${pageId}`;
}

export function candidatePanelUrl(candidate: ReplaceCandidate): string {
	return candidate.kind === 'post'
		? inboundPostPanelUrl(candidate.id)
		: inboundPagePanelUrl(candidate.siteId, candidate.id);
}

export function extractPublicPath(hint: string): string | null {
	const trimmed = hint.trim();
	if (!trimmed) return null;
	try {
		return new URL(trimmed).pathname.replace(/\/+$/, '') || null;
	} catch {
		if (trimmed.startsWith('/')) {
			return trimmed.split(/[?#]/)[0]?.replace(/\/+$/, '') || null;
		}
		const embedded = trimmed.match(/https?:\/\/[^\s]+/i);
		if (!embedded) return null;
		try {
			return new URL(embedded[0]).pathname.replace(/\/+$/, '') || null;
		} catch {
			return null;
		}
	}
}

export function pathSegments(path: string): string[] {
	return path.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
}

export function storageBasename(path: string): string {
	const base = path.split(/[/\\]/).pop() ?? path;
	return base.trim().toLowerCase();
}

export function sameFilename(left: string, right: string): boolean {
	return storageBasename(left) === storageBasename(right);
}

export function isUuid(value: string): boolean {
	return UUID_RE.test(value.trim());
}

export function titleLooksSpecific(hint: string): boolean {
	return hint.replace(/\s+/g, ' ').trim().length >= 8;
}

export function decideReplaceMatch(hits: ReplaceCandidate[]): ReplaceMatch {
	if (hits.length === 1) return { status: 'exact', candidate: hits[0]! };
	if (hits.length > 1) return { status: 'ambiguous', candidates: hits };
	return { status: 'none' };
}
