CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START WITH 1001;

CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_no TEXT NOT NULL UNIQUE DEFAULT ('ORD-' || nextval('public.order_number_seq')),
  customer_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  delivery_address TEXT NOT NULL DEFAULT '',
  product_type TEXT NOT NULL DEFAULT 'T-Shirt',
  fabric TEXT NOT NULL DEFAULT 'Cotton',
  color TEXT NOT NULL DEFAULT '',
  sizes JSONB NOT NULL DEFAULT '[]'::jsonb,
  mockup_url TEXT NOT NULL DEFAULT '',
  print_files_url TEXT NOT NULL DEFAULT '',
  tracking_number TEXT NOT NULL DEFAULT '',
  stage TEXT NOT NULL DEFAULT 'Awaiting Design',
  sales_notes TEXT NOT NULL DEFAULT '',
  designer_notes TEXT NOT NULL DEFAULT '',
  vendor_notes TEXT NOT NULL DEFAULT '',
  created_by_role TEXT NOT NULL DEFAULT 'Sales Agent',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT ALL ON public.orders TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.order_number_seq TO service_role;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();