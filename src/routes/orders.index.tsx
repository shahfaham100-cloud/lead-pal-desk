import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { StageBadge } from "@/components/StageBadge";
import { createOrder, listOrders } from "@/lib/orders.functions";
import { STAGES, totalUnits } from "@/lib/session";

export const Route = createFileRoute("/orders/")({
  head: () => ({
    meta: [
      { title: "Orders — Workwear Ops" },
      { name: "description", content: "All custom workwear orders and their production stage." },
      { property: "og:title", content: "Orders — Workwear Ops" },
      {
        property: "og:description",
        content: "All custom workwear orders and their production stage.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: () => listOrders(),
  component: OrdersPage,
});

function OrdersPage() {
  const { role, orders } = Route.useLoaderData();
  const router = useRouter();
  const newOrder = useServerFn(createOrder);
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("All");
  const [busy, setBusy] = useState(false);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesStage = stage === "All" || order.stage === stage;
      const matchesQuery =
        !q ||
        [order.order_no, order.customer_name, order.email, order.phone]
          .join(" ")
          .toLowerCase()
          .includes(q);
      return matchesStage && matchesQuery;
    });
  }, [orders, query, stage]);

  async function onNewOrder() {
    setBusy(true);
    const { order } = await newOrder({});
    router.navigate({ to: "/orders/$id", params: { id: order.id } });
  }

  return (
    <div className="min-h-screen">
      <AppHeader role={role} />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onNewOrder}
            disabled={busy}
            className="rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            + New order
          </button>
          <div className="flex flex-wrap gap-3">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search order, customer, email"
              className="w-64 rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <select
              value={stage}
              onChange={(event) => setStage(event.target.value)}
              className="rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="All">All</option>
              {STAGES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="panel mt-6 overflow-hidden">
          <div className="grid grid-cols-[130px_1fr] gap-4 border-b border-border px-6 py-3 md:grid-cols-[130px_1.6fr_1fr_150px]">
            <span className="label-caps">Order</span>
            <span className="label-caps">Customer</span>
            <span className="label-caps hidden md:block">Spec</span>
            <span className="label-caps hidden md:block">Stage</span>
          </div>
          {visible.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              No orders yet. Create one to get started.
            </p>
          ) : (
            visible.map((order) => (
              <Link
                key={order.id}
                to="/orders/$id"
                params={{ id: order.id }}
                className="grid grid-cols-[130px_1fr] items-center gap-4 border-b border-border px-6 py-4 transition-colors last:border-0 hover:bg-secondary md:grid-cols-[130px_1.6fr_1fr_150px]"
              >
                <span className="font-mono text-sm font-semibold">{order.order_no}</span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold">
                    {order.customer_name || "Unnamed customer"}
                  </span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {order.delivery_address || "No delivery address"}
                  </span>
                </span>
                <span className="hidden min-w-0 md:block">
                  <span className="block truncate text-sm text-primary">
                    {order.product_type} · {order.fabric}
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    {totalUnits(order.sizes)} units
                  </span>
                </span>
                <span className="hidden md:block">
                  <StageBadge stage={order.stage} />
                </span>
              </Link>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
