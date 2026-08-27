import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Profile } from './lib/types';

// Nazwa pliku nie może pokrywać się z modułem w tym katalogu (`middleware.ts` ↔ `middleware.d.ts`) —
// TypeScript uznałby deklarację za wyjście kompilacji tego modułu i pominął ją w programie.
// `declare global` jest konieczne, bo plik ma importy: bez niego namespace zostaje lokalny.
declare global {
	namespace App {
		interface Locals {
			supabase: SupabaseClient;
			user: User | null;
			profile: Profile | null;
			cspNonce: string;
		}
	}
}
