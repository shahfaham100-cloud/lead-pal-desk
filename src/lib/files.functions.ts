import { createServerFn } from "@tanstack/react-start";

const BUCKET = "order-files";

function safeName(name: string): string {
  return String(name).slice(-120).replace(/[^a-zA-Z0-9._-]/g, "_");
}

export const createUploadUrl = createServerFn({ method: "POST" })
  .inputValidator((data: { orderId: string; field: string; fileName: string }) => data)
  .handler(async ({ data }) => {
    const { requireRole } = await import("./auth.server");
    await requireRole();
    const field = data.field === "print_files" ? "print_files" : "mockup_files";
    const path = `${String(data.orderId)}/${field}/${Date.now()}-${safeName(data.fileName)}`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUploadUrl(path);
    if (error || !signed) throw new Error(error?.message ?? "Could not start upload");
    return { path, token: signed.token };
  });

export const getFileUrl = createServerFn({ method: "POST" })
  .inputValidator((data: { path: string }) => ({ path: String(data.path) }))
  .handler(async ({ data }) => {
    const { requireRole } = await import("./auth.server");
    await requireRole();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(data.path, 60 * 10);
    if (error || !signed) throw new Error(error?.message ?? "Could not open file");
    return { url: signed.signedUrl };
  });

export const removeFile = createServerFn({ method: "POST" })
  .inputValidator((data: { path: string }) => ({ path: String(data.path) }))
  .handler(async ({ data }) => {
    const { requireRole } = await import("./auth.server");
    await requireRole();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.storage.from(BUCKET).remove([data.path]);
    return { ok: true as const };
  });
