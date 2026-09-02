import type { SupabaseClient } from '@supabase/supabase-js';

export type QueryStep = { method: string; args: unknown[] };
export type QueryOp = { table: string; steps: QueryStep[] };
export type QueryResult = { data?: unknown; error?: unknown; count?: number };

/** Zwraca odpowiedz dla zapytania; undefined = { data: null }. */
export type QueryResponder = (op: QueryOp) => QueryResult | undefined;

const CHAIN_METHODS = [
	'select',
	'insert',
	'update',
	'upsert',
	'delete',
	'eq',
	'neq',
	'ilike',
	'like',
	'in',
	'is',
	'or',
	'not',
	'match',
	'filter',
	'lt',
	'lte',
	'gt',
	'gte',
	'order',
	'limit',
	'range',
] as const;

const TERMINAL_METHODS = ['maybeSingle', 'single'] as const;

export type SupabaseFake = {
	client: SupabaseClient;
	calls: QueryOp[];
};

export function createSupabaseFake(responder: QueryResponder = () => undefined): SupabaseFake {
	const calls: QueryOp[] = [];

	const from = (table: string) => {
		const op: QueryOp = { table, steps: [] };
		calls.push(op);
		const resolve = async (): Promise<QueryResult> =>
			responder(op) ?? { data: null, error: null };

		const query: Record<string, unknown> = {
			then: (onOk?: (value: QueryResult) => unknown, onErr?: (reason: unknown) => unknown) =>
				resolve().then(onOk, onErr),
		};
		for (const method of CHAIN_METHODS) {
			query[method] = (...args: unknown[]) => {
				op.steps.push({ method, args });
				return query;
			};
		}
		for (const method of TERMINAL_METHODS) {
			query[method] = (...args: unknown[]) => {
				op.steps.push({ method, args });
				return resolve();
			};
		}
		return query;
	};

	return { client: { from } as unknown as SupabaseClient, calls };
}

/** Argumenty pierwszego kroku o danej nazwie. */
export function stepArgs(op: QueryOp, method: string): unknown[] | undefined {
	return op.steps.find((step) => step.method === method)?.args;
}

/** Czy zapytanie zawiera filtr `.eq(column, value)`. */
export function hasEq(op: QueryOp, column: string, value: unknown): boolean {
	return op.steps.some(
		(step) => step.method === 'eq' && step.args[0] === column && step.args[1] === value,
	);
}

/** Payloady wszystkich `.update()` na wskazanej tabeli, w kolejnosci wywolan. */
export function updatePayloads(fake: SupabaseFake, table: string): Record<string, unknown>[] {
	return fake.calls
		.filter((op) => op.table === table)
		.map((op) => stepArgs(op, 'update')?.[0])
		.filter((payload): payload is Record<string, unknown> => Boolean(payload));
}

/** Zapytania do wskazanej tabeli. */
export function opsFor(fake: SupabaseFake, table: string): QueryOp[] {
	return fake.calls.filter((op) => op.table === table);
}
