import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { deleteOrder, getOrder, updateOrder } from "@/lib/orders.functions";
import { createUploadUrl, getFileUrl, removeFile } from "@/lib/files.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  FABRICS,
  PRODUCT_TYPES,
  STAGES,
  emptyItem,
  fileList,
  orderItems,
  totalUnits,
  type Order,
  type OrderFile,
  type OrderItem,
  type SizeRow,
} from "@/lib/session";

export const Route = createFileRoute("/orders/$id")({
  head: () => ({
    meta: [
      { title: "Order details — Workwear Ops" },
      { name: "description", content: "Customer, product spec, files and notes for this order." },
      { property: "og:title", content: "Order details — Workwear Ops" },
      {
        property: "og:description",
        content: "Customer, product spec, files and notes for this order.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ params }) => getOrder({ data: { id: params.id } }),
  component: OrderDetailPage,
});

const inputClass =
  "w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:border-primary";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label-caps mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel p-6">
      <h2 className="label-caps border-b border-border pb-3">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function formatSize(bytes: number): string {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function FileField({
  label,
  files,
  busy,
  onPick,
  onOpen,
  onRemove,
  editable = true,
}: {
  label: string;
  files: OrderFile[];
  busy: boolean;
  onPick: (files: File[]) => void;
  onOpen: (path: string) => void;
  onRemove: (path: string) => void;
  editable?: boolean;
}) {
  return (
    <div>
      <span className="label-caps mb-1.5 block">{label}</span>
      {files.length > 0 && (
        <ul className="mb-2 space-y-1.5">
          {files.map((file) => (
            <li
              key={file.path}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm"
            >
              <button
                type="button"
                onClick={() => onOpen(file.path)}
                className="truncate text-left text-primary hover:underline"
              >
                {file.name}
              </button>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-xs text-muted-foreground">{formatSize(file.size)}</span>
                {editable && (
                  <button
                    type="button"
                    onClick={() => onRemove(file.path)}
                    className="text-sm text-destructive hover:underline"
                    aria-label={`Remove ${file.name}`}
                  >
                    ✕
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {editable && (
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-card px-3 py-2 text-sm hover:bg-secondary">
          <input
            type="file"
            multiple
            className="hidden"
            disabled={busy}
            onChange={(event) => {
              const picked = Array.from(event.target.files ?? []);
              event.target.value = "";
              if (picked.length > 0) onPick(picked);
            }}
          />
          {busy ? "Uploading…" : files.length > 0 ? "+ Add more files" : "+ Upload files"}
        </label>
      )}
    </div>
  );
}

function OrderDetailPage() {
  const { role, order: initial } = Route.useLoaderData();
  const router = useRouter();
  const save = useServerFn(updateOrder);
  const remove = useServerFn(deleteOrder);
  const signUpload = useServerFn(createUploadUrl);
  const signDownload = useServerFn(getFileUrl);
  const deleteFile = useServerFn(removeFile);
  const [form, setForm] = useState<Order>({ ...initial, items: orderItems(initial) });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const items = form.items;
  const isVendor = role === "Vendor";

  type FileField = "mockup_files" | "print_files";

  async function persistFiles(field: FileField, list: OrderFile[]) {
    setForm((current) => ({ ...current, [field]: list }));
    const { order } = await save({ data: { id: form.id, patch: { [field]: list } } });
    setForm((current) => ({ ...current, [field]: fileList(order[field]) }));
    router.invalidate();
  }

  async function upload(field: FileField, picked: File[]) {
    setUploading(field);
    try {
      const uploaded: OrderFile[] = [];
      for (const file of picked) {
        const { path, token } = await signUpload({
          data: { orderId: form.id, field, fileName: file.name },
        });
        const { error } = await supabase.storage
          .from("order-files")
          .uploadToSignedUrl(path, token, file);
        if (error) throw new Error(error.message);
        uploaded.push({ name: file.name, path, size: file.size });
      }
      await persistFiles(field, [...fileList(form[field]), ...uploaded]);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  async function openFile(path: string) {
    const { url } = await signDownload({ data: { path } });
    window.open(url, "_blank", "noopener");
  }

  async function removeUploaded(field: FileField, path: string) {
    await deleteFile({ data: { path } });
    await persistFiles(
      field,
      fileList(form[field]).filter((file) => file.path !== path),
    );
  }

  function set<K extends keyof Order>(key: K, value: Order[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  function setItems(next: OrderItem[]) {
    set("items", next);
  }

  function setItem(index: number, patch: Partial<OrderItem>) {
    setItems(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function setSize(itemIndex: number, sizeIndex: number, patch: Partial<SizeRow>) {
    const item = items[itemIndex];
    if (!item) return;
    setItem(itemIndex, {
      sizes: item.sizes.map((row, i) => (i === sizeIndex ? { ...row, ...patch } : row)),
    });
  }

  async function onSave() {
    setSaving(true);
    const { order } = await save({
      data: {
        id: form.id,
        patch: {
          customer_name: form.customer_name,
          email: form.email,
          phone: form.phone,
          delivery_address: form.delivery_address,
          items: form.items,
          tracking_number: form.tracking_number,
          stage: form.stage,
          sales_notes: form.sales_notes,
          designer_notes: form.designer_notes,
          vendor_notes: form.vendor_notes,
        },
      },
    });

    setForm({ ...order, items: orderItems(order) });
    setSaving(false);
    setSaved(true);
    router.invalidate();
  }

  async function onDelete() {
    if (!confirm(`Delete ${form.order_no}? This can't be undone.`)) return;
    await remove({ data: { id: form.id } });
    router.navigate({ to: "/orders" });
  }

  return (
    <div className="min-h-screen">
      <AppHeader role={role} />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Link to="/orders" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to orders
        </Link>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-mono text-2xl font-bold">{form.order_no}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Created {new Date(form.created_at).toLocaleDateString()} · {form.created_by_role}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="label-caps">Stage</span>
            <select
              value={form.stage}
              onChange={(event) => set("stage", event.target.value)}
              className="rounded-md border border-input bg-card px-3 py-2 text-sm font-semibold outline-none focus:border-primary"
            >
              {STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <fieldset disabled={isVendor} className="contents">
            <Panel title="Customer & delivery">
              <Field label="Customer name">
                <input
                  className={inputClass}
                  value={form.customer_name}
                  onChange={(event) => set("customer_name", event.target.value)}
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  className={inputClass}
                  value={form.email}
                  onChange={(event) => set("email", event.target.value)}
                />
              </Field>
              <Field label="Phone">
                <input
                  className={inputClass}
                  value={form.phone}
                  onChange={(event) => set("phone", event.target.value)}
                />
              </Field>
              <Field label="Delivery address">
                <textarea
                  rows={3}
                  className={inputClass}
                  value={form.delivery_address}
                  onChange={(event) => set("delivery_address", event.target.value)}
                />
              </Field>
            </Panel>
          </fieldset>

          <div className="grid gap-6">
            <Panel title="Files">
              <FileField
                label="Approved design (mockup)"
                files={fileList(form.mockup_files)}
                busy={uploading === "mockup_files"}
                onPick={(files) => upload("mockup_files", files)}
                onOpen={openFile}
                onRemove={(path) => removeUploaded("mockup_files", path)}
                editable={!isVendor}
              />
              <FileField
                label="Final print-ready files"
                files={fileList(form.print_files)}
                busy={uploading === "print_files"}
                onPick={(files) => upload("print_files", files)}
                onOpen={openFile}
                onRemove={(path) => removeUploaded("print_files", path)}
                editable={!isVendor}
              />
            </Panel>

            {role !== "Sales Agent" && (
              <Panel title="Shipping">
                <Field label="Tracking number">
                  <input
                    className={inputClass}
                    placeholder="Not added"
                    value={form.tracking_number}
                    onChange={(event) => set("tracking_number", event.target.value)}
                  />
                </Field>
              </Panel>
            )}
          </div>
        </div>

        <fieldset disabled={isVendor} className="panel mt-6 p-6 disabled:opacity-75">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <h2 className="label-caps">Products ({items.length})</h2>
            <span className="text-sm text-muted-foreground">
              {items.reduce((sum, item) => sum + totalUnits(item.sizes), 0)} units total
            </span>
          </div>

          <div className="mt-4 space-y-4">
            {items.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No products yet — add the first one below.
              </p>
            )}
            {items.map((item, index) => (
              <div key={index} className="rounded-lg border border-border bg-secondary/40 p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="label-caps">Product {index + 1}</span>
                  <button
                    type="button"
                    onClick={() => setItems(items.filter((_, i) => i !== index))}
                    className="rounded-md border border-input bg-card px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10"
                  >
                    Remove product
                  </button>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <Field label="Product type">
                    <select
                      className={inputClass}
                      value={item.product_type}
                      onChange={(event) => setItem(index, { product_type: event.target.value })}
                    >
                      {PRODUCT_TYPES.map((type) => (
                        <option key={type}>{type}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Fabric">
                    <select
                      className={inputClass}
                      value={item.fabric}
                      onChange={(event) => setItem(index, { fabric: event.target.value })}
                    >
                      {FABRICS.map((fabric) => (
                        <option key={fabric}>{fabric}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Color">
                    <input
                      className={inputClass}
                      value={item.color}
                      onChange={(event) => setItem(index, { color: event.target.value })}
                    />
                  </Field>
                </div>

                <div className="mt-4">
                  <span className="label-caps mb-1.5 block">
                    Sizing & quantities · {totalUnits(item.sizes)} units
                  </span>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {item.sizes.map((row, sizeIndex) => (
                      <div key={sizeIndex} className="flex gap-2">
                        <input
                          className={inputClass}
                          value={row.size}
                          placeholder="Size"
                          onChange={(event) =>
                            setSize(index, sizeIndex, { size: event.target.value })
                          }
                        />
                        <input
                          type="number"
                          min={0}
                          className="w-24 rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:border-primary"
                          value={row.qty}
                          onChange={(event) =>
                            setSize(index, sizeIndex, { qty: Number(event.target.value) })
                          }
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setItem(index, {
                              sizes: item.sizes.filter((_, i) => i !== sizeIndex),
                            })
                          }
                          className="rounded-md border border-input bg-card px-3 text-sm text-destructive hover:bg-destructive/10"
                          aria-label={`Remove size ${row.size}`}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setItem(index, { sizes: [...item.sizes, { size: "", qty: 0 }] })}
                    className="mt-3 rounded-md border border-input bg-card px-3 py-1.5 text-sm hover:bg-secondary"
                  >
                    + Add size
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setItems([...items, emptyItem()])}
            className="mt-4 rounded-md border border-primary/40 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10"
          >
            + Add product
          </button>
        </fieldset>

        <div className="mt-6">
          <Panel title="Notes">
            <div className="grid gap-4 lg:grid-cols-2">
              <Field label="Sales notes">
                <textarea
                  rows={4}
                  className={inputClass}
                  placeholder="Placement, print method, artwork tweaks…"
                  value={form.sales_notes}
                  onChange={(event) => set("sales_notes", event.target.value)}
                  disabled={isVendor}
                />
              </Field>
              <Field label="Production notes">
                <textarea
                  rows={4}
                  className={inputClass}
                  placeholder="Production or vendor updates…"
                  value={form.vendor_notes}
                  onChange={(event) => set("vendor_notes", event.target.value)}
                />
              </Field>
            </div>
          </Panel>
        </div>

        <div className="mt-6 flex items-center justify-between gap-4">
          <div>
            {role === "Admin" && (
              <button
                onClick={onDelete}
                className="rounded-md border border-destructive/40 px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10"
              >
                Delete order
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {saved && <span className="text-sm text-primary">Saved</span>}
            <button
              onClick={onSave}
              disabled={saving}
              className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
