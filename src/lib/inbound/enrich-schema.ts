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

export const inboundEnrichSchema = z.object({
	posts: z
		.array(inboundEnrichPostSchema)
		.min(1)
		.max(3)
		.describe(
			'Osobny element na każdą sprawę dla odbiorcy. Ujęcia tej samej sprawy razem. Inny obowiązek albo wydarzenie = osobny wpis. Nie streszczaj kilku spraw w jednym leadzie. Nie dziel po pliku.',
		),
});

export type InboundEnrichObject = z.infer<typeof inboundEnrichSchema>;
