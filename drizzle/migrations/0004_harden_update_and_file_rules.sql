CREATE OR REPLACE FUNCTION public.dsx_update_order(p_token text, p_id uuid, p_patch jsonb) RETURNS public.orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cur public.orders; n public.orders;
BEGIN
  PERFORM private.assert_token(p_token);
  SELECT * INTO cur FROM public.orders WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  n := jsonb_populate_record(cur, p_patch - 'id' - 'order_no' - 'created_at' - 'updated_at' - 'created_by_role');
  UPDATE public.orders SET
    customer_name = n.customer_name, email = n.email, phone = n.phone,
    delivery_address = n.delivery_address, product_type = n.product_type, fabric = n.fabric,
    color = n.color, sizes = n.sizes, mockup_url = n.mockup_url, print_files_url = n.print_files_url,
    tracking_number = n.tracking_number, stage = n.stage, sales_notes = n.sales_notes,
    designer_notes = n.designer_notes, vendor_notes = n.vendor_notes, items = n.items,
    mockup_files = n.mockup_files, print_files = n.print_files, sales_agent_name = n.sales_agent_name,
    shipping_company = n.shipping_company, dispatch_date = n.dispatch_date
  WHERE id = p_id RETURNING * INTO n;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.dsx_update_order(text, uuid, jsonb) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.dsx_update_order(text, uuid, jsonb) TO anon, service_role;

CREATE OR REPLACE FUNCTION public.dsx_request_has_token() RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE t text;
BEGIN
  t := nullif(current_setting('request.headers', true), '')::json ->> 'x-dsx-token';
  IF t IS NULL OR length(t) < 32 THEN RETURN false; END IF;
  RETURN EXISTS (SELECT 1 FROM private.access_tokens WHERE hash = encode(extensions.digest(t, 'sha256'), 'hex'));
END $$;
REVOKE ALL ON FUNCTION public.dsx_request_has_token() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dsx_request_has_token() TO anon;

DROP POLICY IF EXISTS "order files read by server" ON storage.objects;
DROP POLICY IF EXISTS "order files delete by server" ON storage.objects;
CREATE POLICY "order files read by server" ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'order-files' AND public.dsx_request_has_token());
CREATE POLICY "order files delete by server" ON storage.objects FOR DELETE TO anon
  USING (bucket_id = 'order-files' AND public.dsx_request_has_token());