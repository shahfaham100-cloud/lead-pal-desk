CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS private.access_tokens (hash text PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now());
REVOKE ALL ON private.access_tokens FROM PUBLIC, anon, authenticated;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION private.assert_token(p_token text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  IF p_token IS NULL OR length(p_token) < 32 OR NOT EXISTS (
    SELECT 1 FROM private.access_tokens WHERE hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
  ) THEN RAISE EXCEPTION 'Server access code not accepted' USING ERRCODE = '42501'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.dsx_list_orders(p_token text) RETURNS SETOF public.orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM private.assert_token(p_token);
  RETURN QUERY SELECT * FROM public.orders ORDER BY created_at DESC; END $$;

CREATE OR REPLACE FUNCTION public.dsx_get_order(p_token text, p_id uuid) RETURNS SETOF public.orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM private.assert_token(p_token);
  RETURN QUERY SELECT * FROM public.orders WHERE id = p_id; END $$;

CREATE OR REPLACE FUNCTION public.dsx_create_order(p_token text, p_role text, p_items jsonb) RETURNS public.orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.orders;
BEGIN PERFORM private.assert_token(p_token);
  INSERT INTO public.orders (created_by_role, items) VALUES (p_role, p_items) RETURNING * INTO r;
  RETURN r; END $$;

CREATE OR REPLACE FUNCTION public.dsx_update_order(p_token text, p_id uuid, p_patch jsonb) RETURNS public.orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE k text; r public.orders;
BEGIN PERFORM private.assert_token(p_token);
  FOR k IN SELECT jsonb_object_keys(p_patch) LOOP
    IF k IN ('id','order_no','created_at','updated_at') OR NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name=k
    ) THEN CONTINUE; END IF;
    EXECUTE format('UPDATE public.orders SET %I = (jsonb_populate_record(NULL::public.orders, $1)).%I WHERE id = $2', k, k)
      USING p_patch, p_id;
  END LOOP;
  SELECT * INTO r FROM public.orders WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  RETURN r; END $$;

CREATE OR REPLACE FUNCTION public.dsx_delete_order(p_token text, p_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM private.assert_token(p_token);
  DELETE FROM public.orders WHERE id = p_id; END $$;

REVOKE ALL ON FUNCTION public.dsx_list_orders(text), public.dsx_get_order(text, uuid),
  public.dsx_create_order(text, text, jsonb), public.dsx_update_order(text, uuid, jsonb),
  public.dsx_delete_order(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dsx_list_orders(text), public.dsx_get_order(text, uuid),
  public.dsx_create_order(text, text, jsonb), public.dsx_update_order(text, uuid, jsonb),
  public.dsx_delete_order(text, uuid) TO anon, service_role;
REVOKE ALL ON FUNCTION private.assert_token(text) FROM PUBLIC;

CREATE POLICY "order files read by server" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'order-files');
CREATE POLICY "order files upload by server" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'order-files');
CREATE POLICY "order files delete by server" ON storage.objects FOR DELETE TO anon USING (bucket_id = 'order-files');