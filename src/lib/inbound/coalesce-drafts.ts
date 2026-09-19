import type { EnrichAttachment, EnrichDraft } from './enrich-model';
import { groupMessageClusters, type ClusterFile } from './message-clusters';

function clusterOfDraft(draft: EnrichDraft, fileToGroup: Map<string, number>): number | null {
	const keys = new Set<number>();
	for (const att of draft.attachments) {
		if (att.display === 'drop') continue;
		const group = fileToGroup.get(att.filename);
		if (group != null) keys.add(group);
	}
	return keys.size === 1 ? [...keys][0]! : null;
}

export function mergeDraftTitles(titles: string[]): string {
	const normalized = titles.map((title) => title.replace(/\s+/g, ' ').trim()).filter(Boolean);
	if (normalized.length === 0) return '';
	if (normalized.length === 1) return normalized[0]!;
	const wordLists = normalized.map((title) => title.split(/[\s–—/:|-]+/).filter(Boolean));
	const common: string[] = [];
	const first = wordLists[0] ?? [];
	for (let i = 0; i < first.length; i++) {
		const word = first[i]!;
		if (wordLists.every((words) => words[i]?.toLowerCase() === word.toLowerCase())) {
			common.push(word);
		} else break;
	}
	return common.join(' ').length >= 4 ? common.join(' ') : normalized[0]!;
}

function mergeAttachments(rows: EnrichAttachment[][]): EnrichAttachment[] {
	const out: EnrichAttachment[] = [];
	const seen = new Set<string>();
	for (const list of rows) {
		for (const row of list) {
			if (seen.has(row.filename)) continue;
			seen.add(row.filename);
			out.push(row);
		}
	}
	return out;
}

function mergeDraftGroup(drafts: EnrichDraft[]): EnrichDraft {
	const first = drafts[0]!;
	return {
		title: mergeDraftTitles(drafts.map((row) => row.title)),
		contentMd: drafts.map((row) => row.contentMd.trim()).find(Boolean) ?? first.contentMd,
		categorySlug: drafts.map((row) => row.categorySlug).find((slug) => slug) ?? null,
		extraCategorySlugs: [...new Set(drafts.flatMap((row) => row.extraCategorySlugs))],
		attachments: mergeAttachments(drafts.map((row) => row.attachments)),
	};
}

export function omitCoverLetterDrafts(drafts: EnrichDraft[], files: ClusterFile[]): EnrichDraft[] {
	const dropNames = new Set(
		files.filter((row) => row.suggestedDisplay === 'drop').map((row) => row.filename),
	);
	if (dropNames.size === 0 || drafts.length <= 1) return drafts;
	const kept = drafts.filter((draft) => {
		const visible = draft.attachments.filter((row) => row.display !== 'drop');
		if (visible.length === 0) return false;
		return visible.some((row) => !dropNames.has(row.filename));
	});
	return kept.length > 0 ? kept : drafts;
}

/** Scala szkice, których pliki należą do tego samego komunikatu. */
export function coalesceDrafts(drafts: EnrichDraft[], files: ClusterFile[]): EnrichDraft[] {
	if (drafts.length <= 1) return drafts;
	const groups = groupMessageClusters(files);
	if (groups.length === 0 || groups.length >= drafts.length) return drafts;

	const fileToGroup = new Map<string, number>();
	groups.forEach((group, index) => {
		for (const name of group.filenames) fileToGroup.set(name, index);
	});

	const buckets = new Map<string, EnrichDraft[]>();
	const order: string[] = [];
	drafts.forEach((draft, index) => {
		const cluster = clusterOfDraft(draft, fileToGroup);
		const key = cluster == null ? `solo:${index}` : `c:${cluster}`;
		const bucket = buckets.get(key);
		if (bucket) bucket.push(draft);
		else {
			buckets.set(key, [draft]);
			order.push(key);
		}
	});
	return order.map((key) => mergeDraftGroup(buckets.get(key)!));
}
