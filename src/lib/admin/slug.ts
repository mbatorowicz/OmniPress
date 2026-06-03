export function normalizeSlug(input: string): string {
	return input
		.toLowerCase()
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.replace(/[^a-z0-9-]+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 80);
}

export function isValidSlug(slug: string): boolean {
	return slug.length >= 2 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}
