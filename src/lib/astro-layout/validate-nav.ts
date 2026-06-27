import type { NavItem } from './types';

export type NavLinkRef = {
	href: string;
	labelPath: string;
};

export type NavValidationIssue = {
	href: string;
	labelPath: string;
	reason: 'dead_link' | 'missing_href';
};

export function isExternalHref(href: string): boolean {
	return /^https?:\/\//i.test(href.trim());
}

export function normalizeInternalHref(href: string): string {
	const trimmed = href.trim().replace(/\/+$/, '');
	if (!trimmed.startsWith('/')) return `/${trimmed}`;
	return trimmed || '/';
}

export function collectNavHrefs(items: NavItem[], parentLabels: string[] = []): NavLinkRef[] {
	const refs: NavLinkRef[] = [];
	for (const item of items) {
		const labels = [...parentLabels, item.label];
		if (item.href?.trim()) {
			refs.push({ href: item.href.trim(), labelPath: labels.join(' → ') });
		}
		if (item.children?.length) {
			refs.push(...collectNavHrefs(item.children, labels));
		}
	}
	return refs;
}

export function validateNavigationLinks(
	navigation: NavItem[],
	knownInternalPaths: Set<string>,
): NavValidationIssue[] {
	const issues: NavValidationIssue[] = [];

	function walk(items: NavItem[], parentLabels: string[] = []) {
		for (const item of items) {
			const labels = [...parentLabels, item.label];
			const labelPath = labels.join(' → ');
			const hasChildren = Boolean(item.children?.length);
			const href = item.href?.trim();

			if (!href && !hasChildren) {
				issues.push({ href: '', labelPath, reason: 'missing_href' });
			} else if (href && !isExternalHref(href)) {
				const normalized = normalizeInternalHref(href);
				if (!knownInternalPaths.has(normalized)) {
					issues.push({ href: normalized, labelPath, reason: 'dead_link' });
				}
			}

			if (hasChildren) walk(item.children!, labels);
		}
	}

	walk(navigation);
	return issues;
}

export function formatNavValidationIssues(issues: NavValidationIssue[]): string[] {
	return issues.map((issue) => {
		if (issue.reason === 'missing_href') {
			return `${issue.labelPath}: brak linku (href)`;
		}
		return `${issue.labelPath}: ${issue.href}`;
	});
}

export async function buildKnownNavPaths(
	supabase: import('@supabase/supabase-js').SupabaseClient,
	siteId: string,
	categorySlugs: string[],
	extraPaths: string[] = ['/'],
): Promise<Set<string>> {
	const { listPublishedSitePagePaths } = await import('@/lib/site-pages');
	const pagePaths = await listPublishedSitePagePaths(supabase, siteId);
	const paths = new Set<string>(extraPaths.map(normalizeInternalHref));

	for (const slug of categorySlugs) {
		if (slug.trim()) paths.add(normalizeInternalHref(`/${slug.trim()}`));
	}
	for (const p of pagePaths) paths.add(normalizeInternalHref(p));

	return paths;
}
