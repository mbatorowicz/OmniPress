-- Zużycie bazy i Storage — tylko administrator (panel /admin/usage).

CREATE OR REPLACE FUNCTION public.admin_usage_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
	v_result jsonb;
BEGIN
	IF public.current_app_role() IS DISTINCT FROM 'admin' THEN
		RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
	END IF;

	WITH objects AS (
		SELECT
			coalesce((o.metadata ->> 'size')::bigint, 0) AS bytes,
			coalesce(nullif(o.metadata ->> 'mimetype', ''), a.mime_type, '') AS mime,
			coalesce(
				nullif(a.filename, ''),
				regexp_replace(o.name, '^.*/', '')
			) AS filename
		FROM storage.objects o
		LEFT JOIN LATERAL (
			SELECT filename, mime_type
			FROM public.assets
			WHERE storage_path = o.name
			LIMIT 1
		) a ON true
		WHERE o.bucket_id = 'post-assets'
	)
	SELECT jsonb_build_object(
		'database_bytes', pg_database_size(current_database()),
		'storage_bytes', coalesce((SELECT sum(bytes) FROM objects), 0),
		'storage_count', (SELECT count(*)::int FROM objects),
		'by_mime', coalesce((
			SELECT jsonb_object_agg(
				mime,
				jsonb_build_object('bytes', bytes, 'count', cnt)
			)
			FROM (
				SELECT mime, sum(bytes)::bigint AS bytes, count(*)::int AS cnt
				FROM objects
				GROUP BY mime
			) grouped
		), '{}'::jsonb),
		'largest', coalesce((
			SELECT jsonb_agg(
				jsonb_build_object(
					'filename', filename,
					'mime', mime,
					'bytes', bytes
				)
				ORDER BY ord
			)
			FROM (
				SELECT
					filename,
					mime,
					bytes,
					row_number() OVER (ORDER BY bytes DESC, filename) AS ord
				FROM objects
				WHERE bytes > 0
			) ranked
			WHERE ord <= 10
		), '[]'::jsonb)
	)
	INTO v_result;

	RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_usage_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_usage_stats() TO authenticated;

COMMENT ON FUNCTION public.admin_usage_stats() IS
	'Rozmiar bazy i bucketu post-assets. Tylko current_app_role = admin.';
