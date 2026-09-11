ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS mockup_files jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS print_files jsonb NOT NULL DEFAULT '[]'::jsonb;