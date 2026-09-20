import { z } from 'zod';

export const inboundEnrichAttachmentSchema = z.object({
	filename: z.string().describe('Dokładna nazwa pliku z listy załączników'),
	display: z.enum(['embed', 'link', 'drop']),
});

export const inboundEnrichPostSchema = z.object({
	title: z
		.string()
		.describe(
			'Nagłówek sprawy z obrazu, jak tytuł newsa. Nie „Plakaty…”, nie „Plakat o…”, nie opis pliku.',
		),
	category_slug: z
		.string()
		.nullable()
		.describe(
			'Domyślnie aktualnosci, jeśli jest na liście. Węższą kategorię tylko gdy materiał wyraźnie do niej należy.',
		),
	extra_category_slugs: z.array(z.string()).optional(),
	content_md: z.string().describe('Krótki lead z odczytanego materiału'),
	attachments: z
		.array(inboundEnrichAttachmentSchema)
		.optional()
		.describe('Wszystkie pliki z tej przesyłki, które należą do wpisu (poza pismem).'),
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
		.max(1)
		.default([])
		.describe(
			'Tylko intent create. Zawsze jeden element: jeden mail = jeden wpis. Wszystkie załączniki przesyłki (poza pismem) w tym elemencie. Nie dziel.',
		),
	replace: inboundEnrichReplaceSchema.optional(),
	clarification: inboundEnrichClarificationSchema.optional(),
});

export type InboundEnrichObject = z.infer<typeof inboundEnrichSchema>;
