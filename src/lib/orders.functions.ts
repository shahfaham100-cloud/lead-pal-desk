import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import {
  FABRICS,
  PRODUCT_TYPES,
  STAGES,
  emptyItem,
  type Order,
  type OrderItem,
  type SizeRow,
} from "./session";

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

function cleanItems(value: unknown): OrderItem[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 30).map((raw) => {
    const item = (raw ?? {}) as OrderItem;
    const type = String(item.product_type ?? "");
    const fabric = String(item.fabric ?? "");
    return {
      product_type: PRODUCT_TYPES.includes(type as (typeof PRODUCT_TYPES)[number])
        ? type
        : PRODUCT_TYPES[0],
      fabric: FABRICS.includes(fabric as (typeof FABRICS)[number]) ? fabric : FABRICS[0],
      color: String(item.color ?? "").slice(0, 100),
      sizes: cleanSizes(item.sizes),
    };
  });
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
  const role = await requireRole(["Sales Agent", "Admin"]);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("orders")
    .insert({
      created_by_role: role,
      items: [emptyItem()],
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
    const role = await (await import("./auth.server")).requireRole();
    const p = data.patch ?? {};
    const patch: Record<string, unknown> = {};
    if (role === "Vendor") {
      if ("tracking_number" in p) patch["tracking_number"] = text(p.tracking_number);
      if ("vendor_notes" in p) patch["vendor_notes"] = text(p.vendor_notes, 4000);
      if ("stage" in p) {
        const stage = String(p.stage);
        if (!STAGES.includes(stage as (typeof STAGES)[number])) throw new Error("Unknown stage");
        patch["stage"] = stage;
      }
    } else {
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
        "sales_notes",
        "designer_notes",
        "vendor_notes",
      ] as const;
      for (const field of textFields) {
        if (field in p) patch[field] = text(p[field], field.endsWith("notes") ? 4000 : 500);
      }
      if (role === "Admin" && "tracking_number" in p) {
        patch["tracking_number"] = text(p.tracking_number);
      }
      if ("delivery_address" in p) patch["delivery_address"] = text(p.delivery_address, 1000);
      for (const field of ["mockup_files", "print_files"] as const) {
        if (field in p) {
          const value = p[field];
          const list = Array.isArray(value) ? value : [];
          patch[field] = list.slice(0, 50).map((file) => ({
            name: text(file?.name, 200),
            path: text(file?.path, 400),
            size: Math.max(0, Number(file?.size) || 0),
          }));
        }
      }
      if ("sizes" in p) patch["sizes"] = cleanSizes(p.sizes);
      if ("items" in p) patch["items"] = cleanItems(p.items);
      if ("stage" in p) {
        const stage = String(p.stage);
        if (!STAGES.includes(stage as (typeof STAGES)[number])) throw new Error("Unknown stage");
        patch["stage"] = stage;
      }
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
