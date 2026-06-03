import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Profile } from './lib/types';

declare namespace App {
	interface Locals {
		supabase: SupabaseClient;
		user: User | null;
		profile: Profile | null;
	}
}
