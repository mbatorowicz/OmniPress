import type { SlotWidgetConfig } from './types';
import {
	isExternalHref,
	isKnownInternalPath,
	normalizeInternalHref,
	type NavValidationIssue,
} from './validate-nav';

export function validateFooterLinks(
	widget: SlotWidgetConfig | undefined,
	knownInternalPaths: Set<string>,
): NavValidationIssue[] {
	const issues: NavValidationIssue[] = [];

	const cta = widget?.contactCtaHref?.trim();
	if (cta && !isExternalHref(cta)) {
		const normalized = normalizeInternalHref(cta);
		if (!isKnownInternalPath(normalized, knownInternalPaths)) {
			issues.push({
				href: normalized,
				labelPath: 'Stopka → Kontakt i mapa',
				reason: 'dead_link',
			});
		}
	}

	for (const link of widget?.legalLinks ?? []) {
		const href = link.href?.trim();
		const labelPath = `Stopka → ${link.label || 'link'}`;
		if (!href) {
			issues.push({ href: '', labelPath, reason: 'missing_href' });
			continue;
		}
		if (isExternalHref(href)) continue;
		const normalized = normalizeInternalHref(href);
		if (!isKnownInternalPath(normalized, knownInternalPaths)) {
			issues.push({ href: normalized, labelPath, reason: 'dead_link' });
		}
	}

	return issues;
}
