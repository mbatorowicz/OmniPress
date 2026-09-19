import { z } from 'zod';

export const inboundEnrichAttachmentSchema = z.object({
	filename: z.string(),
	display: z.enum(['embed', 'link', 'drop']),
});

export const inboundEnrichPostSchema = z.object({
	title: z.string(),
	category_slug: z.string().nullable(),
	extra_category_slugs: z.array(z.string()).optional(),
	content_md: z.string(),
	attachments: z.array(inboundEnrichAttachmentSchema).optional(),
});

export const inboundEnrichSchema = z.object({
	posts: z.array(inboundEnrichPostSchema).min(1).max(3),
});

export type InboundEnrichObject = z.infer<typeof inboundEnrichSchema>;
