import { z } from 'zod';

export const inboundEnrichSchema = z.object({
	title: z.string(),
	category_slug: z.string().nullable(),
	extra_category_slugs: z.array(z.string()).optional(),
	content_md: z.string(),
});

export type InboundEnrichObject = z.infer<typeof inboundEnrichSchema>;
