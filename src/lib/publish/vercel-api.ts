const VERCEL_API = 'https://api.vercel.com';

export type VercelConfig = {
	projectId: string;
	teamId?: string;
};

export type VercelDeployment = {
	uid: string;
	state: string;
	readyState?: string;
	url?: string;
	meta?: Record<string, string | undefined>;
};

export type VercelDeployEvent = {
	type?: string;
	created?: number;
	payload?: { text?: string };
};

export function parseVercelConfig(config: Record<string, unknown>): VercelConfig | null {
	const projectId = String(config.vercel_project_id ?? '').trim();
	if (!projectId) return null;
	const teamId = String(config.vercel_team_id ?? '').trim();
	return teamId ? { projectId, teamId } : { projectId };
}

export function resolveVercelToken(
	storedToken?: string | null,
): string | null {
	const fromStored = storedToken?.trim();
	if (fromStored) return fromStored;
	const fromEnv = import.meta.env.VERCEL_TOKEN?.trim();
	return fromEnv || null;
}

function appendTeamId(path: string, teamId?: string): string {
	if (!teamId) return path;
	const sep = path.includes('?') ? '&' : '?';
	return `${path}${sep}teamId=${encodeURIComponent(teamId)}`;
}

export async function vercelFetch<T>(
	path: string,
	token: string,
	teamId?: string,
): Promise<T> {
	const url = `${VERCEL_API}${appendTeamId(path, teamId)}`;
	const res = await fetch(url, {
		headers: {
			Authorization: `Bearer ${token}`,
			'User-Agent': 'OmniPress',
		},
	});
	if (!res.ok) {
		const body = await res.text().catch(() => '');
		throw new Error(`Vercel HTTP ${res.status}${body ? `: ${body.slice(0, 160)}` : ''}`);
	}
	return (await res.json()) as T;
}

export async function probeVercelProject(
	cfg: VercelConfig,
	token: string,
): Promise<{ ok: true; name: string } | { ok: false; detail: string }> {
	try {
		const data = await vercelFetch<{ name?: string }>(
			`/v9/projects/${encodeURIComponent(cfg.projectId)}`,
			token,
			cfg.teamId,
		);
		return { ok: true, name: data.name ?? cfg.projectId };
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'nieznany błąd';
		return { ok: false, detail: msg.slice(0, 200) };
	}
}

export async function listRecentDeployments(
	cfg: VercelConfig,
	token: string,
	limit = 5,
): Promise<VercelDeployment[]> {
	const data = await vercelFetch<{ deployments?: VercelDeployment[] }>(
		`/v6/deployments?projectId=${encodeURIComponent(cfg.projectId)}&limit=${limit}`,
		token,
		cfg.teamId,
	);
	return data.deployments ?? [];
}

export async function findDeploymentByCommitSha(
	cfg: VercelConfig,
	token: string,
	commitSha: string,
): Promise<VercelDeployment | null> {
	const shortSha = commitSha.slice(0, 7);
	const data = await vercelFetch<{ deployments?: VercelDeployment[] }>(
		`/v6/deployments?projectId=${encodeURIComponent(cfg.projectId)}&limit=10&meta-githubCommitSha=${encodeURIComponent(commitSha)}`,
		token,
		cfg.teamId,
	);
	const exact = data.deployments?.find(
		(d) => d.meta?.githubCommitSha === commitSha || d.meta?.githubCommitSha?.startsWith(shortSha),
	);
	if (exact) return exact;

	for (const deployment of data.deployments ?? []) {
		const sha = deployment.meta?.githubCommitSha ?? '';
		if (sha.startsWith(shortSha) || commitSha.startsWith(sha)) return deployment;
	}
	return null;
}

export async function getDeploymentEvents(
	deploymentUid: string,
	token: string,
	teamId?: string,
): Promise<VercelDeployEvent[]> {
	const data = await vercelFetch<VercelDeployEvent[]>(
		`/v3/deployments/${encodeURIComponent(deploymentUid)}/events`,
		token,
		teamId,
	);
	return Array.isArray(data) ? data : [];
}

const ERROR_LINE_RE =
	/(error|failed|✗|Expected "|Build failed|Command ".+" exited with)/i;

/** Wyciąga czytelny fragment logu buildu przy błędzie Vercel. */
export function extractBuildFailureFromEvents(events: VercelDeployEvent[]): string {
	const lines: string[] = [];
	for (const event of events) {
		const text = event.payload?.text?.trim();
		if (!text) continue;
		if (event.type === 'stderr' || ERROR_LINE_RE.test(text)) {
			lines.push(text.replace(/\s+/g, ' '));
		}
	}

	if (lines.length === 0) {
		for (const event of events.slice(-12)) {
			const text = event.payload?.text?.trim();
			if (text) lines.push(text.replace(/\s+/g, ' '));
		}
	}

	const unique = [...new Set(lines)];
	return unique.slice(-6).join(' | ').slice(0, 420) || 'Build Vercel zakończył się błędem (brak szczegółów w logu).';
}

export function deploymentStateLabel(deployment: VercelDeployment): string {
	return deployment.readyState ?? deployment.state ?? 'UNKNOWN';
}

export function isDeploymentTerminal(state: string): boolean {
	return state === 'READY' || state === 'ERROR' || state === 'CANCELED';
}

export function isDeploymentSuccess(state: string): boolean {
	return state === 'READY';
}

export async function sleep(ms: number): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, ms));
}
