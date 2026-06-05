import {
	deploymentStateLabel,
	extractBuildFailureFromEvents,
	findDeploymentByCommitSha,
	getDeploymentEvents,
	isDeploymentSuccess,
	isDeploymentTerminal,
	sleep,
	type VercelConfig,
} from './vercel-api';

export type VercelBuildCheckResult =
	| { ok: true; summary: string }
	| { ok: false; summary: string; retryable: boolean };

export type WaitForVercelBuildOptions = {
	cfg: VercelConfig;
	token: string;
	commitSha: string;
	maxWaitMs?: number;
	pollIntervalMs?: number;
};

const DEFAULT_MAX_WAIT_MS = 55_000;
const DEFAULT_POLL_MS = 4_000;

/** Czeka na deploy Vercel powiązany z commitem GitHub i zwraca status + log błędu. */
export async function waitForVercelBuild(
	opts: WaitForVercelBuildOptions,
): Promise<VercelBuildCheckResult> {
	const maxWaitMs = opts.maxWaitMs ?? DEFAULT_MAX_WAIT_MS;
	const pollIntervalMs = opts.pollIntervalMs ?? DEFAULT_POLL_MS;
	const started = Date.now();

	await sleep(2_000);

	let deployment = await findDeploymentByCommitSha(opts.cfg, opts.token, opts.commitSha);

	while (!deployment && Date.now() - started < maxWaitMs) {
		await sleep(pollIntervalMs);
		deployment = await findDeploymentByCommitSha(opts.cfg, opts.token, opts.commitSha);
	}

	if (!deployment) {
		return {
			ok: true,
			summary: 'Vercel: brak deploya dla commitu (sprawdź dashboard — może opóźnienie)',
		};
	}

	let state = deploymentStateLabel(deployment);

	while (!isDeploymentTerminal(state) && Date.now() - started < maxWaitMs) {
		await sleep(pollIntervalMs);
		const again = await findDeploymentByCommitSha(opts.cfg, opts.token, opts.commitSha);
		if (again) {
			deployment = again;
			state = deploymentStateLabel(deployment);
		}
	}

	if (isDeploymentSuccess(state)) {
		const host = deployment.url ? `https://${deployment.url}` : 'produkcja';
		return { ok: true, summary: `Vercel: deploy OK (${host})` };
	}

	if (state === 'ERROR' || state === 'CANCELED') {
		let detail = `status ${state}`;
		try {
			const events = await getDeploymentEvents(deployment.uid, opts.token, opts.cfg.teamId);
			detail = extractBuildFailureFromEvents(events);
		} catch {
			// brak logów — zostaw status
		}
		return {
			ok: false,
			summary: `Vercel BUILD FAILED: ${detail}`,
			retryable: true,
		};
	}

	return {
		ok: true,
		summary: `Vercel: build w toku (${state}) — sprawdź dashboard projektu`,
	};
}
