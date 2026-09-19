import { inboundAi } from '@/i18n';

export function enrichRetrySystem(clusters: number, posts: number): string | null {
	if (clusters <= 0 || posts === clusters) return null;
	if (posts < clusters) {
		return `${inboundAi.system} ${inboundAi.splitRetry.replace('{n}', String(clusters))}`;
	}
	return `${inboundAi.system} ${inboundAi.mergeRetry
		.replace('{n}', String(clusters))
		.replace('{got}', String(posts))}`;
}
