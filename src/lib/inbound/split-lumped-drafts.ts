import { humanizeLabel } from '@/lib/content/humanize-label';
import { mergeDraftTitles } from './coalesce-drafts';
import type { EnrichAttachment, EnrichDraft } from './enrich-model';
import { filenameStem, filenameTopicTokens, groupMessageClusters, type ClusterFile } from './message-clusters';

const MATERIAL_PREFIX = /^(plakat|ulotka|poster|skan|załącznik|zalacznik)\s+/i;

function folded(value: string): string {
	return value
		.normalize('NFKD')
		.replace(/\p{M}/gu, '')
		.toLowerCase();
}

function labelFromFilename(filename: string): string {
	const raw = humanizeLabel(filenameStem(filename), '');
	const stripped = raw.replace(MATERIAL_PREFIX, '').trim();
	if (!stripped) return raw;
	return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

export function titleFromClusterFiles(files: ClusterFile[], fallback: string): string {
	const labels = files.map((row) => labelFromFilename(row.filename)).filter(Boolean);
	if (labels.length === 0) return fallback;
	if (labels.length === 1) return labels[0]!;
	const prefix = mergeDraftTitles(labels).trim();
	const tails = labels
		.map((label) => label.slice(prefix.length).replace(/^[\s–—:-]+/, '').trim())
		.filter(Boolean);
	if (prefix.length >= 4 && tails.length === labels.length) {
		return `${prefix} – ${tails.join(' i ')}`;
	}
	return prefix || labels[0]!;
}

function titleMentionsFiles(title: string, files: ClusterFile[]): boolean {
	const hay = folded(title);
	return files.some((row) => [...filenameTopicTokens(row.filename)].some((token) => hay.includes(token)));
}

function fileMap(files: ClusterFile[]): Map<string, ClusterFile> {
	return new Map(files.map((row) => [row.filename, row]));
}

function clusterFilesFor(names: string[], byName: Map<string, ClusterFile>): ClusterFile[] {
	return names.map((name) => byName.get(name)).filter((row): row is ClusterFile => Boolean(row));
}

function splitOneDraft(
	draft: EnrichDraft,
	fileToGroup: Map<string, number>,
	groups: { filenames: string[] }[],
	byName: Map<string, ClusterFile>,
): EnrichDraft[] {
	const drops = draft.attachments.filter((row) => row.display === 'drop');
	const visible = draft.attachments.filter((row) => row.display !== 'drop');
	const buckets = new Map<number, EnrichAttachment[]>();
	const other: EnrichAttachment[] = [];
	for (const att of visible) {
		const group = fileToGroup.get(att.filename);
		if (group == null) other.push(att);
		else {
			const bucket = buckets.get(group);
			if (bucket) bucket.push(att);
			else buckets.set(group, [att]);
		}
	}
	if (buckets.size <= 1) return [draft];

	const ordered = groups
		.map((_, index) => index)
		.filter((index) => buckets.has(index));
	const uniqueKeep =
		ordered.filter((index) =>
			titleMentionsFiles(draft.title, clusterFilesFor(groups[index]!.filenames, byName)),
		).length === 1;

	return ordered.map((index, i) => {
		const core = buckets.get(index) ?? [];
		const attachments = i === 0 ? [...core, ...other, ...drops] : [...core];
		const cluster = clusterFilesFor(
			core.map((row) => row.filename),
			byName,
		);
		const keepGrok = uniqueKeep && titleMentionsFiles(draft.title, cluster);
		const title = keepGrok ? draft.title : titleFromClusterFiles(cluster, draft.title);
		return {
			title,
			contentMd: keepGrok ? draft.contentMd : `${title}.`,
			categorySlug: draft.categorySlug,
			extraCategorySlugs: draft.extraCategorySlugs,
			attachments,
		};
	});
}

/** Gdy Grok sklei osobne materiały w jeden wpis — rozdziel po klastrach (to samo co coalesce scala). */
export function splitLumpedDrafts(drafts: EnrichDraft[], files: ClusterFile[]): EnrichDraft[] {
	const groups = groupMessageClusters(files);
	if (groups.length <= 1) return drafts;

	const fileToGroup = new Map<string, number>();
	groups.forEach((group, index) => {
		for (const name of group.filenames) fileToGroup.set(name, index);
	});
	const byName = fileMap(files);
	return drafts.flatMap((draft) => splitOneDraft(draft, fileToGroup, groups, byName));
}
