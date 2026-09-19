import { inboundAi } from '@/i18n';
import type { CategoryOption } from '@/lib/categories';
import type { InboundFileInventory } from './collect-attachment-texts';

export type EnrichPromptInput = {
	title: string;
	contentMd: string;
	attachments: InboundFileInventory[];
	categories: Pick<CategoryOption, 'slug' | 'name'>[];
};

function formatAttachment(row: InboundFileInventory): string {
	const pages = row.pageCount != null ? `, ${row.pageCount} str.` : '';
	const chars = row.text ? `, ${row.text.length} znaków` : '';
	const body = row.text.trim()
		? row.text
		: inboundAi.emptyAttachmentText;
	return `--- ${row.filename} (${row.mime}${pages}${chars}, sugerowane: ${row.suggestedDisplay}) ---\n${body}`;
}

export function buildInboundEnrichPrompt(input: EnrichPromptInput): string {
	const categories =
		input.categories.length === 0
			? inboundAi.noCategories
			: input.categories.map((c) => `- ${c.slug}: ${c.name}`).join('\n');
	const attachments =
		input.attachments.length === 0
			? inboundAi.noAttachments
			: input.attachments.map(formatAttachment).join('\n\n');
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
		'',
		inboundAi.splitReminder,
	].join('\n');
}
