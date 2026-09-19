import { inboundAi } from '@/i18n';
import type { CategoryOption } from '@/lib/categories';
import type { ExtractedAttachmentText } from './extract-attachment-text';

export type EnrichPromptInput = {
	title: string;
	contentMd: string;
	attachments: ExtractedAttachmentText[];
	categories: Pick<CategoryOption, 'slug' | 'name'>[];
};

export function buildInboundEnrichPrompt(input: EnrichPromptInput): string {
	const categories =
		input.categories.length === 0
			? inboundAi.noCategories
			: input.categories.map((c) => `- ${c.slug}: ${c.name}`).join('\n');
	const attachments =
		input.attachments.length === 0
			? inboundAi.noAttachments
			: input.attachments.map((a) => `--- ${a.filename} ---\n${a.text}`).join('\n\n');
	return [
		`${inboundAi.subjectLabel}: ${input.title || inboundAi.emptySubject}`,
		'',
		`${inboundAi.bodyLabel}:`,
		input.contentMd || inboundAi.emptyBody,
		'',
		`${inboundAi.attachmentsLabel}:`,
		attachments,
		'',
		`${inboundAi.categoriesLabel}:`,
		categories,
	].join('\n');
}
