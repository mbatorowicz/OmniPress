-- Współdzielony rate limit auth (fallback gdy brak Upstash Redis).

CREATE TABLE IF NOT EXISTS auth_rate_limits (
	key text PRIMARY KEY,
	count integer NOT NULL DEFAULT 0,
	reset_at timestamptz NOT NULL
);

ALTER TABLE auth_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.check_auth_rate_limit(
	p_key text,
	p_window_seconds integer,
	p_max_attempts integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
	v_now timestamptz := now();
	v_row auth_rate_limits%ROWTYPE;
	v_retry integer;
BEGIN
	SELECT * INTO v_row FROM auth_rate_limits WHERE key = p_key FOR UPDATE;

	IF NOT FOUND OR v_now >= v_row.reset_at THEN
		INSERT INTO auth_rate_limits (key, count, reset_at)
		VALUES (p_key, 1, v_now + make_interval(secs => p_window_seconds))
		ON CONFLICT (key) DO UPDATE
			SET count = 1, reset_at = excluded.reset_at;
		RETURN jsonb_build_object('allowed', true);
	END IF;

	IF v_row.count >= p_max_attempts THEN
		v_retry := GREATEST(1, EXTRACT(EPOCH FROM (v_row.reset_at - v_now))::integer);
		RETURN jsonb_build_object('allowed', false, 'retry_after_sec', v_retry);
	END IF;

	UPDATE auth_rate_limits SET count = v_row.count + 1 WHERE key = p_key;
	RETURN jsonb_build_object('allowed', true);
END;
$$;

REVOKE ALL ON FUNCTION public.check_auth_rate_limit(text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_auth_rate_limit(text, integer, integer) TO service_role;
