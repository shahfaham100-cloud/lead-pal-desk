ALTER TABLE public.orders ADD COLUMN shipping_company text NOT NULL DEFAULT '';
ALTER TABLE public.orders ADD COLUMN dispatch_date date;