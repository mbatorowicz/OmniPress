import type { SiteAstroLayout, SlotWidgetConfig } from './types';
import { validateFooterLinks } from './validate-footer';
import {
	normalizeInternalHref,
	validateNavigationLinks,
	type NavValidationIssue,
} from './validate-nav';

export function findFooterMainWidget(layout: SiteAstroLayout): SlotWidgetConfig | undefined {
	return layout.zones.footer.components.find((slot) => slot.component === 'footer.main')?.widget;
}

/** Menu + stopka — te same known paths, bez self-checku (P0-9). */
export function validateLayoutPublicLinks(
	layout: SiteAstroLayout,
	knownInternalPaths: Set<string>,
): NavValidationIssue[] {
	return [
		...validateNavigationLinks(layout.navigation, knownInternalPaths),
		...validateFooterLinks(findFooterMainWidget(layout), knownInternalPaths),
	];
}

function issueKey(issue: NavValidationIssue): string {
	return `${issue.reason}:${normalizeInternalHref(issue.href)}`;
}

/** Przy publikacji samych kategorii nie blokuj linków, które już są na stronie live. */
export function blockingLayoutLinkIssues(
	section: string,
	before: NavValidationIssue[],
	after: NavValidationIssue[],
): NavValidationIssue[] {
	if (section !== 'categories') return after;
	const existing = new Set(before.map(issueKey));
	return after.filter((issue) => !existing.has(issueKey(issue)));
}
