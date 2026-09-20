import { z } from 'zod';

export const inboundEnrichAttachmentSchema = z.object({
	filename: z.string().describe('Dokładna nazwa pliku z listy załączników'),
	display: z.enum(['embed', 'link', 'drop']),
});

export const inboundEnrichPostSchema = z.object({
	title: z.string().describe('Tytuł tej jednej sprawy, nie ogólnik i nie streszczenie kilku tematów'),
	category_slug: z
		.string()
		.nullable()
		.describe(
			'Domyślnie aktualnosci, jeśli jest na liście. Węższą kategorię tylko gdy materiał wyraźnie do niej należy.',
		),
	extra_category_slugs: z.array(z.string()).optional(),
	content_md: z.string().describe('Krótki lead wyłącznie tej sprawy'),
	attachments: z.array(inboundEnrichAttachmentSchema).optional(),
});

export const inboundEnrichReplaceSchema = z.object({
	target: z.enum(['post', 'page']),
	hint: z.string().describe('Tytuł, slug, URL albo nazwa pliku z maila'),
	filename: z.string().optional(),
	display: z.enum(['embed', 'link']).optional(),
});

export const inboundEnrichClarificationSchema = z.object({
	needed: z.boolean(),
	question: z.string().describe('Krótkie pytanie po polsku'),
});

export const inboundEnrichSchema = z.object({
	intent: z.enum(['create', 'replace', 'clarify']).default('create'),
	posts: z
		.array(inboundEnrichPostSchema)
		.max(3)
		.default([])
		.describe(
			'Tylko intent create. Domyślnie jeden wpis. Dwa albo trzy tylko przy osobnych sprawach dla odbiorcy. Nie dziel po pliku.',
		),
	replace: inboundEnrichReplaceSchema.optional(),
	clarification: inboundEnrichClarificationSchema.optional(),
});

export type InboundEnrichObject = z.infer<typeof inboundEnrichSchema>;
