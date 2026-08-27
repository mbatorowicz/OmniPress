import { z } from 'zod';

/**
 * Kontrakt front-matteru wpisów news — lustrzane odbicie `src/content.config.ts`
 * w repo Astro (kolekcja `news`). Zod w Astro **nie** używa `.strict()`, więc nadmiarowe
 * pola znikają po cichu; ten schemat ma `.strict()` i łapie dryf przy publikacji z OmniPress.
 *
 * Przy zmianie pól w repo Astro zaktualizuj ten plik i `frontmatter-contract.test.ts`.
 */
export const astroNewsFrontmatterSchema = z
	.object({
		title: z.string(),
		date: z.string().optional(),
		pubDate: z.union([z.string(), z.date()]).optional(),
		author: z.string().optional(),
		category: z.string().optional(),
		categoryName: z.string().optional(),
		excerpt: z.string().optional(),
		coverImage: z.string().optional(),
		galleryImages: z.array(z.string()).optional(),
		pinned: z.boolean().optional(),
		draft: z.boolean().optional(),
	})
	.strict();

export type AstroNewsFrontmatter = z.infer<typeof astroNewsFrontmatterSchema>;

/** Parsuje surowe pola YAML z bloku front-matter (bez transformacji daty). */
export function parseRawFrontmatterFields(md: string): Record<string, unknown> {
	const match = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
	if (!match) return {};

	const fields: Record<string, unknown> = {};
	for (const line of match[1]!.split('\n')) {
		const trimmed = line.trim();
		if (!trimmed) continue;

		if (trimmed.startsWith('galleryImages:')) {
			const inner = trimmed.match(/galleryImages:\s*\[(.*)\]\s*$/);
			fields.galleryImages = inner?.[1]
				? [...inner[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]!)
				: [];
			continue;
		}

		const idx = trimmed.indexOf(':');
		if (idx <= 0) continue;
		const key = trimmed.slice(0, idx).trim();
		const raw = trimmed.slice(idx + 1).trim();
		if (raw === 'true') fields[key] = true;
		else if (raw === 'false') fields[key] = false;
		else if (raw.startsWith('"') && raw.endsWith('"')) fields[key] = raw.slice(1, -1);
		else fields[key] = raw;
	}
	return fields;
}
