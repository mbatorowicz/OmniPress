import type { CertAdvisoriesFile } from './types';

export function buildCertAdvisoriesPayload(file: CertAdvisoriesFile): string {
	return `${JSON.stringify(file, null, '\t')}\n`;
}
