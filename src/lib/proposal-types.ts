// ── Proposal types ──────────────────────────────────────────────

export interface Proposal {
  id: string;
  token: string;
  client_name: string;
  tier: 1 | 2; // client pricing tier — defaults to 1 for legacy rows
  expires_at: string;
  viewed: boolean;
  viewed_at: string | null;
  converted: boolean;
  converted_at: string | null;
  selected_services: SelectedService[] | null;
  order_total_cents: number | null;
  shopify_order_id: string | null;
  created_at: string;
}

export interface SelectedService {
  serviceId: string;
  mode: "one-off" | "retainer";
  quantity: number;
}
