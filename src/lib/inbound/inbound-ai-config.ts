/** Grok 4.6 z myśleniem — ID z katalogu AI Gateway. */
export const DEFAULT_INBOUND_AI_MODEL = 'spacexai/grok-4.6';
/** high = łańcuch myślenia (domyśl modelu). xhigh nie mieści się w Hobby 60 s. */
export const DEFAULT_INBOUND_AI_REASONING = 'high' as const;
/** Timeout wokół generateObject; raster PDF jest poza nim. Webhook: maxDuration 60 s. */
export const INBOUND_AI_TIMEOUT_MS = 55_000;

export type InboundAiEnv = Record<string, string | undefined>;

function readEnv(env: InboundAiEnv, key: string): string {
	return env[key]?.trim() ?? '';
}

/** Pusty `INBOUND_AI_MODEL` wyłącza enrichment. Brak zmiennej = Grok. */
export function inboundAiModel(env: InboundAiEnv): string {
	const raw = env.INBOUND_AI_MODEL;
	if (typeof raw === 'string' && raw.trim() === '') return '';
	return raw?.trim() || DEFAULT_INBOUND_AI_MODEL;
}

export function inboundAiConfigured(env: InboundAiEnv): boolean {
	if (!inboundAiModel(env)) return false;
	if (readEnv(env, 'AI_GATEWAY_API_KEY')) return true;
	const vercel = readEnv(env, 'VERCEL');
	return vercel === '1' || vercel === 'true';
}

export function inboundAiEnvFromMeta(): InboundAiEnv {
	const meta = import.meta.env as InboundAiEnv;
	return {
		INBOUND_AI_MODEL: meta.INBOUND_AI_MODEL ?? process.env.INBOUND_AI_MODEL,
		AI_GATEWAY_API_KEY: meta.AI_GATEWAY_API_KEY ?? process.env.AI_GATEWAY_API_KEY,
		VERCEL: meta.VERCEL ?? process.env.VERCEL,
	};
}
