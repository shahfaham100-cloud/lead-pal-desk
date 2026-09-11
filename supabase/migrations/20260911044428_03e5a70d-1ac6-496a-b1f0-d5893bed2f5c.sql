ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS items jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.orders
SET items = jsonb_build_array(
  jsonb_build_object(
    'product_type', product_type,
    'fabric', fabric,
    'color', color,
    'sizes', sizes
  )
)
WHERE jsonb_array_length(items) = 0;