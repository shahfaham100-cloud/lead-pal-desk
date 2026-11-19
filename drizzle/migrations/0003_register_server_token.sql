CREATE OR REPLACE FUNCTION public.dsx_register_token(p_token text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  IF p_token IS NULL OR length(p_token) < 32 THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM private.access_tokens) THEN RETURN false; END IF;
  INSERT INTO private.access_tokens(hash) VALUES (encode(extensions.digest(p_token, 'sha256'), 'hex'));
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.dsx_register_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dsx_register_token(text) TO anon;