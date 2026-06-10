import type { AuthSession } from '@/lib/auth/require';

/** Wynik guarda — sesja lub gotowa odpowiedź HTTP. */
export type GuardResult = AuthSession | Response;
