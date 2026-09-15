import { prepareStorageMarkdown } from '@/lib/content/prepare-markdown';
import { stripPublishedAttachments } from '@/lib/publish/import-asset-model';

export function editorialPageContent(raw: string, hasAssets: boolean): string {
	const prepared = prepareStorageMarkdown(raw);
	return hasAssets ? stripPublishedAttachments(prepared) : prepared;
}
