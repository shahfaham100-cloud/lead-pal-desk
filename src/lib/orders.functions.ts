import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { STAGES, type Order, type SizeRow } from "./session";

const SELECT = "*";

function cleanSizes(value: unknown): SizeRow[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => ({
      size: String((row as SizeRow)?.size ?? "").slice(0, 20),
      qty: Math.max(0, Math.min(100000, Number((row as SizeRow)?.qty) || 0)),
    }))
    .filter((row) => row.size.length > 0);
}

function text(value: unknown, max = 500): string {
  return String(value ?? "").slice(0, max);
}

export const listOrders = createServerFn({ method: "GET" }).handler(async () => {
  const { requireRole } = await import("./auth.server");
  const role = await requireRole();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(SELECT)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return { role, orders: (data ?? []) as unknown as Order[] };
});

export const getOrder = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => ({ id: String(data.id) }))
  .handler(async ({ data }) => {
    const { requireRole } = await import("./auth.server");
    const role = await requireRole();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("orders")
      .select(SELECT)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw notFound();
    return { role, order: row as unknown as Order };
  });

export const createOrder = createServerFn({ method: "POST" }).handler(async () => {
  const { requireRole } = await import("./auth.server");
  const role = await requireRole();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("orders")
    .insert({
      created_by_role: role,
      sizes: [
        { size: "S", qty: 0 },
        { size: "M", qty: 0 },
        { size: "L", qty: 0 },
        { size: "XL", qty: 0 },
      ],
    })
    .select(SELECT)
    .single();
  if (error) throw new Error(error.message);
  return { order: data as unknown as Order };
});

export type OrderPatch = Partial<Omit<Order, "id" | "order_no" | "created_at" | "updated_at">>;

export const updateOrder = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; patch: OrderPatch }) => data)
  .handler(async ({ data }) => {
    await (await import("./auth.server")).requireRole();
    const p = data.patch ?? {};
    const patch: Record<string, unknown> = {};
    const textFields = [
      "customer_name",
      "email",
      "phone",
      "delivery_address",
      "product_type",
      "fabric",
      "color",
      "mockup_url",
      "print_files_url",
      "tracking_number",
      "sales_notes",
      "designer_notes",
      "vendor_notes",
    ] as const;
    for (const field of textFields) {
      if (field in p) patch[field] = text(p[field], field.endsWith("notes") ? 4000 : 500);
    }
    if ("delivery_address" in p) patch["delivery_address"] = text(p.delivery_address, 1000);
    if ("sizes" in p) patch["sizes"] = cleanSizes(p.sizes);
    if ("stage" in p) {
      const stage = String(p.stage);
      if (!STAGES.includes(stage as (typeof STAGES)[number])) throw new Error("Unknown stage");
      patch["stage"] = stage;
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("orders")
      .update(patch as never)
      .eq("id", String(data.id))
      .select(SELECT)
      .single();
    if (error) throw new Error(error.message);
    return { order: row as unknown as Order };
  });

export const deleteOrder = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => ({ id: String(data.id) }))
  .handler(async ({ data }) => {
    await (await import("./auth.server")).requireRole(["Admin"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("orders").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
