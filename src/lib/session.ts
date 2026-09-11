export const ROLES = ["Sales Agent", "Admin"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  "Sales Agent": "Create orders & upload approved designs",
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
  "T-Shirt",
  "Polo",
  "Hoodie",
  "Hi-Vis Vest",
  "Work Shirt",
  "Cap",
  "Jacket",
] as const;

export const FABRICS = ["Cotton", "Polyester", "Poly-Cotton", "Fleece", "Ripstop"] as const;

export type SizeRow = { size: string; qty: number };

export type Order = {
  id: string;
  order_no: string;
  customer_name: string;
  email: string;
  phone: string;
  delivery_address: string;
  product_type: string;
  fabric: string;
  color: string;
  sizes: SizeRow[];
  mockup_url: string;
  print_files_url: string;
  tracking_number: string;
  stage: string;
  sales_notes: string;
  designer_notes: string;
  vendor_notes: string;
  created_by_role: string;
  created_at: string;
  updated_at: string;
};

export function totalUnits(sizes: SizeRow[]): number {
  return sizes.reduce((sum, row) => sum + (Number(row.qty) || 0), 0);
}
