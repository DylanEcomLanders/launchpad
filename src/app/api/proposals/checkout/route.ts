import { NextResponse } from "next/server";
import { getServiceById, getPrice, getUnitPriceForQuantity, retainerBuildDiscount } from "@/data/services";
import type { ServiceMode, ClientTier } from "@/data/services";

// ── Create Shopify Draft Order from proposal selections ─────────
// Builds custom line items from the service catalog using tier-
// specific pricing, then returns the Draft Order invoice URL
// for the client to complete payment.

interface SelectionPayload {
  serviceId: string;
  mode: ServiceMode;
  quantity: number;
}

export async function POST(request: Request) {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const adminToken = process.env.SHOPIFY_ADMIN_API_TOKEN;

  if (!storeDomain || !adminToken) {
    console.error("[checkout] Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_API_TOKEN");
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 }
    );
  }

  // ── Parse & validate request body ───────────────────────────
  let body: {
    selections: SelectionPayload[];
    proposalToken: string;
    clientName: string;
    clientEmail?: string;
    tier?: number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { selections, proposalToken, clientName, clientEmail } = body;
  const tier: ClientTier = body.tier === 2 ? 2 : 1;

  if (!selections?.length || !proposalToken || !clientName) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // ── Determine retainer discount for builds ─────────────────
  // If the client selected a CRO retainer, page builds get a discount
  let buildDiscount = 0;
  for (const sel of selections) {
    const d = retainerBuildDiscount[sel.serviceId];
    if (d && d > buildDiscount) buildDiscount = d;
  }

  // ── Build line items from service catalog ───────────────────
  const lineItems = selections
    .map((sel) => {
      const service = getServiceById(sel.serviceId);
      if (!service) return null;

      const pricing = service.pricing[sel.mode];
      if (!pricing) return null;

      // Resolve tier-specific pricing
      const tierPrice = getPrice(pricing, tier);
      let amountPence = tierPrice.amount;

      // Apply volume discounts for per-unit services
      const volumeResult = getUnitPriceForQuantity(service, amountPence, sel.quantity);
      if (volumeResult.discounted) {
        amountPence = volumeResult.amount;
      }

      // Apply retainer discount to build-category services
      if (service.category === "builds" && buildDiscount > 0) {
        amountPence = Math.round(amountPence * (1 - buildDiscount));
      }

      // Shopify Draft Order expects price in decimal (pounds), not pence
      const priceDecimal = (amountPence / 100).toFixed(2);
      const title =
        sel.mode === "retainer"
          ? `${service.name} (Monthly Retainer)`
          : service.name;

      return {
        title,
        price: priceDecimal,
        quantity: sel.quantity,
        taxable: true,
      };
    })
    .filter(Boolean);

  if (lineItems.length === 0) {
    return NextResponse.json(
      { error: "No valid services selected" },
      { status: 400 }
    );
  }

  // ── Create Draft Order via Shopify Admin API ────────────────
  const draftOrderPayload = {
    draft_order: {
      line_items: lineItems,
      note: `Proposal: ${proposalToken}`,
      note_attributes: [
        { name: "proposal_token", value: proposalToken },
        { name: "client_name", value: clientName },
        { name: "pricing_tier", value: String(tier) },
        ...(clientEmail
          ? [{ name: "client_email", value: clientEmail }]
          : []),
        ...(buildDiscount > 0
          ? [{ name: "retainer_build_discount", value: `${Math.round(buildDiscount * 100)}%` }]
          : []),
      ],
      // Pre-fill customer email if available
      ...(clientEmail && { email: clientEmail }),
      // Use Shopify's payment terms — client pays via invoice link
      use_customer_default_address: false,
    },
  };

  try {
    const res = await fetch(
      `https://${storeDomain}/admin/api/2024-10/draft_orders.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": adminToken,
        },
        body: JSON.stringify(draftOrderPayload),
      }
    );

    if (!res.ok) {
      const errorBody = await res.text();
      console.error("[checkout] Shopify Draft Order error:", res.status, errorBody);
      return NextResponse.json(
        { error: "Failed to create draft order" },
        { status: 502 }
      );
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const data: any = await res.json();
    const invoiceUrl = data.draft_order?.invoice_url;
    /* eslint-enable @typescript-eslint/no-explicit-any */

    if (!invoiceUrl) {
      console.error("[checkout] No invoice_url in response:", JSON.stringify(data));
      return NextResponse.json(
        { error: "Draft order created but no invoice URL returned" },
        { status: 502 }
      );
    }

    return NextResponse.json({ invoiceUrl });
  } catch (err) {
    console.error("[checkout] Shopify API request failed:", err);
    return NextResponse.json(
      { error: "Failed to reach Shopify" },
      { status: 502 }
    );
  }
}
