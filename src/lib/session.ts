export const ROLES = ["Sales Agent", "Vendor", "Admin"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  "Sales Agent": "Create orders & upload approved designs",
  Vendor: "Update production, shipping & vendor notes",
  Admin: "Full access & settings",
};

export const STAGES = [
  "Awaiting Design",
  "Design Ready",
  "In Production",
  "Shipped",
  "Delivered",
  "Cancelled",
] as const;
export type Stage = (typeof STAGES)[number];

export const PRODUCT_TYPES = [
  "Hoodie",
  "Polo",
  "T-Shirt",
  "Cap",
  "Jacket",
  "Vest",
  "Other",
] as const;

export const SLEEVE_PLACEHOLDER = "Select Option";
export const SLEEVES = [SLEEVE_PLACEHOLDER, "Long Sleeves", "Short Sleeves", "Sleeveless"] as const;
export type Sleeve = (typeof SLEEVES)[number];

export const FABRICS = ["Cotton", "Polyester", "Poly-Cotton", "Fleece", "Ripstop"] as const;

export type SizeRow = { size: string; qty: number };

export type OrderFile = { name: string; path: string; size: number };

export type OrderItem = {
  product_type: string;
  other_text: string;
  sleeves: string;
  fabric: string;
  color: string;
  sizes: SizeRow[];
  image: OrderFile | null;
};

export const DEFAULT_SIZES: SizeRow[] = [
  { size: "S", qty: 0 },
  { size: "M", qty: 0 },
  { size: "L", qty: 0 },
  { size: "XL", qty: 0 },
];

export function emptyItem(): OrderItem {
  return {
    product_type: PRODUCT_TYPES[0],
    other_text: "",
    sleeves: SLEEVES[0],
    fabric: FABRICS[0],
    color: "",
    sizes: DEFAULT_SIZES.map((row) => ({ ...row })),
    image: null,
  };
}

export type Order = {
  id: string;
  order_no: string;
  customer_name: string;
  email: string;
  phone: string;
  delivery_address: string;
  items: OrderItem[];
  product_type: string;
  fabric: string;
  color: string;
  sizes: SizeRow[];
  mockup_url: string;
  print_files_url: string;
  mockup_files: OrderFile[];
  print_files: OrderFile[];
  tracking_number: string;
  stage: string;
  sales_notes: string;
  designer_notes: string;
  vendor_notes: string;
  created_by_role: string;
  sales_agent_name: string;
  created_at: string;
  updated_at: string;
};

export function totalUnits(sizes: SizeRow[]): number {
  return (sizes ?? []).reduce((sum, row) => sum + (Number(row.qty) || 0), 0);
}

export function orderItems(order: Pick<Order, "items">): OrderItem[] {
  return Array.isArray(order.items) ? order.items : [];
}

export function orderUnits(order: Pick<Order, "items">): number {
  return orderItems(order).reduce((sum, item) => sum + totalUnits(item.sizes), 0);
}

export function orderSpecSummary(order: Pick<Order, "items">): string {
  const items = orderItems(order);
  if (items.length === 0) return "No products yet";
  const first = items[0]!;
  const type = first.product_type === "Other" && first.other_text ? first.other_text : first.product_type;
  const label = `${type} · ${first.fabric}`;
  return items.length > 1 ? `${label} +${items.length - 1} more` : label;
}

export function fileList(value: unknown): OrderFile[] {
  return Array.isArray(value) ? (value as OrderFile[]) : [];
}
