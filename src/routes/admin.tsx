import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { AppHeader } from "@/components/AppHeader";
import { StageBadge } from "@/components/StageBadge";
import { STAGES, orderUnits, type Order } from "@/lib/session";

const getAdminOverview = createServerFn({ method: "GET" }).handler(async () => {
  const { requireRole } = await import("@/lib/auth.server");
  const role = await requireRole(["Admin"]);
  const { db, dbToken } = await import("@/lib/db.server");
  const { data, error } = await db().rpc("dsx_list_orders", { p_token: dbToken() });
  if (error) throw new Error(error.message);
  return { role, orders: (data ?? []) as unknown as Order[] };
});

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin overview — DSX Printing Services" },
      { name: "description", content: "Production totals and every order across all stages." },
      { property: "og:title", content: "Admin overview — DSX Printing Services" },
      {
        property: "og:description",
        content: "Production totals and every order across all stages.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: () => getAdminOverview(),
  component: AdminPage,
});

function AdminPage() {
  const { role, orders } = Route.useLoaderData();
  const units = orders.reduce((sum, order) => sum + orderUnits(order), 0);
  const open = orders.filter(
    (order) => order.stage !== "Delivered" && order.stage !== "Cancelled",
  ).length;

  return (
    <div className="min-h-screen">
      <AppHeader role={role} />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="text-2xl font-bold">Admin overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Full visibility across every order. Admins can also delete orders from an order page.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { label: "Total orders", value: orders.length },
            { label: "Open orders", value: open },
            { label: "Units in the system", value: units },
          ].map((stat) => (
            <div key={stat.label} className="panel p-5">
              <p className="label-caps">{stat.label}</p>
              <p className="mt-2 font-mono text-3xl font-bold">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[300px_1fr]">
          <section className="panel p-6">
            <h2 className="label-caps border-b border-border pb-3">By stage</h2>
            <ul className="mt-4 space-y-3">
              {STAGES.map((stage) => (
                <li key={stage} className="flex items-center justify-between gap-3">
                  <StageBadge stage={stage} />
                  <span className="font-mono text-sm font-semibold">
                    {orders.filter((order) => order.stage === stage).length}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel overflow-hidden">
            <h2 className="label-caps border-b border-border px-6 py-4">All orders</h2>
            {orders.length > 0 && (
              <div className="flex items-center gap-4 border-b border-border bg-secondary/40 px-6 py-2.5 text-muted-foreground">
                <span className="label-caps w-24 shrink-0">Order</span>
                <span className="label-caps min-w-0 flex-1">Customer</span>
                <span className="label-caps hidden w-36 shrink-0 truncate sm:block">Sales agent</span>
                <span className="label-caps hidden w-16 shrink-0 text-right sm:block">Units</span>
                <span className="label-caps">Stage</span>
              </div>
            )}
            {orders.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-muted-foreground">No orders yet.</p>
            ) : (
              orders.map((order) => (
                <Link
                  key={order.id}
                  to="/orders/$id"
                  params={{ id: order.id }}
                  className="flex items-center gap-4 border-b border-border px-6 py-4 transition-colors last:border-0 hover:bg-secondary"
                >
                  <span className="w-24 shrink-0 font-mono text-sm font-semibold">{order.order_no}</span>
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {order.customer_name || "Unnamed customer"}
                  </span>
                  <span className="hidden w-36 shrink-0 truncate text-sm text-muted-foreground sm:block">
                    {order.sales_agent_name || "—"}
                  </span>
                  <span className="hidden w-16 shrink-0 text-right text-sm text-muted-foreground sm:block">
                    {orderUnits(order)}
                  </span>
                  <StageBadge stage={order.stage} />
                </Link>
              ))
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
