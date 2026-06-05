import { decryptSecret } from '@/lib/crypto';
import type { DestinationType } from '@/lib/types';
import type { DestinationForPublish } from './types';
import { resolveVercelToken as resolveVercelTokenFromEnv } from './vercel-api';

export type GitHubCredentials = {
	token: string;
	vercel_token?: string;
};

export async function decryptDestinationCredentials(
	destination: DestinationForPublish,
): Promise<GitHubCredentials | null> {
	if (!destination.encrypted_credentials) return null;
	try {
		const plain = await decryptSecret(destination.encrypted_credentials);
		return JSON.parse(plain) as GitHubCredentials;
	} catch {
		return null;
	}
}

export function isGitHubCredentials(
	type: DestinationType,
	creds: GitHubCredentials,
): creds is GitHubCredentials {
	return type === 'github_astro' && typeof creds.token === 'string' && creds.token.length > 0;
}

export function resolveVercelTokenForDestination(creds: GitHubCredentials | null): string | null {
	return resolveVercelTokenFromEnv(creds?.vercel_token);
}
