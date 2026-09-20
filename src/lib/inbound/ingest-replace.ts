import { inboundAi } from '@/i18n';
import { jsonOk } from '@/lib/api/response';
import { extractFromEmail } from './allowlist';
import { applyInboundReplace } from './apply-replace';
import type { InboundFileInventory } from './collect-attachment-texts';
import type { EnrichReplace } from './enrich-outcome';
import type { InboundEmailDeps } from './handle-deps';
import { ingestClarify } from './ingest-clarify';
import { candidatePanelUrl, type ReplaceMatch } from './match-replace-model';
import { matchReplaceTarget } from './match-replace-target';
import { notifyInboundDraft } from './notify-draft';
import { createServiceSupabase, isServiceSupabaseConfigured } from '@/lib/supabase/service';

async function defaultMatch(siteSlug: string, hint: string, filename?: string | null): Promise<ReplaceMatch> {
	if (!isServiceSupabaseConfigured()) return { status: 'none' };
	return matchReplaceTarget(createServiceSupabase(), siteSlug, hint, filename);
}

export async function ingestReplace(input: {
	emailId: string;
	from: string;
	subject: string;
	siteSlug: string;
	replace: EnrichReplace;
	inventory: InboundFileInventory[];
	deps: InboundEmailDeps;
	record: NonNullable<InboundEmailDeps['recordInbound']>;
}): Promise<Response> {
	const match = await (input.deps.matchReplace ?? defaultMatch)(
		input.siteSlug,
		input.replace.hint,
		input.replace.filename,
	);
	if (match.status !== 'exact') {
		return ingestClarify({
			...input,
			question: inboundAi.unclearReplace,
			candidates: match.status === 'ambiguous' ? match.candidates : [],
		});
	}

	const apply =
		input.deps.applyReplace ??
		(async (row) => {
			if (!isServiceSupabaseConfigured()) return { ok: false as const, error: 'upload_failed' as const };
			return applyInboundReplace(createServiceSupabase(), row);
		});
	const applied = await apply({
		candidate: match.candidate,
		inventory: input.inventory,
		filename: input.replace.filename,
		display: input.replace.display,
	});
	if (!applied.ok) {
		return ingestClarify({
			...input,
			question: inboundAi.unclearReplace,
			candidates: [match.candidate],
		});
	}

	const fromEmail = extractFromEmail(input.from) ?? input.from;
	const recorded = await input.record({
		messageId: input.emailId,
		fromEmail,
		status: 'replaced',
		postId: match.candidate.kind === 'post' ? match.candidate.id : null,
		pageId: match.candidate.kind === 'page' ? match.candidate.id : null,
	});
	if (!recorded.ok || !recorded.created) {
		return jsonOk({ created: false, replaced: Boolean(recorded.ok && !recorded.created) });
	}

	const panelUrl = candidatePanelUrl(match.candidate);
	await (input.deps.notify ?? notifyInboundDraft)(
		match.candidate.kind === 'post' ? match.candidate.id : null,
		match.candidate.title,
		{
			kind: 'replace',
			panelUrl,
			siteId: match.candidate.siteId,
			pageId: match.candidate.kind === 'page' ? match.candidate.id : undefined,
		},
	);
	return jsonOk({ created: false, replaced: true, panelUrl });
}
