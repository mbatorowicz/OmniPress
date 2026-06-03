import { decryptSecret } from '@/lib/crypto';
import type { DestinationType } from '@/lib/types';
import type { DestinationForPublish } from './types';

export type WordPressCredentials = {
	username: string;
	application_password: string;
};

export type GitHubCredentials = {
	token: string;
};

export async function decryptDestinationCredentials(
	destination: DestinationForPublish,
): Promise<WordPressCredentials | GitHubCredentials | null> {
	if (!destination.encrypted_credentials) return null;
	try {
		const plain = await decryptSecret(destination.encrypted_credentials);
		return JSON.parse(plain) as WordPressCredentials | GitHubCredentials;
	} catch {
		return null;
	}
}

export function isWordPressCredentials(
	type: DestinationType,
	creds: WordPressCredentials | GitHubCredentials,
): creds is WordPressCredentials {
	return type === 'wordpress' && 'username' in creds && 'application_password' in creds;
}

export function isGitHubCredentials(
	type: DestinationType,
	creds: WordPressCredentials | GitHubCredentials,
): creds is GitHubCredentials {
	return type === 'github_astro' && 'token' in creds;
}
