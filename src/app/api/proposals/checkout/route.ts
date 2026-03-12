import { NextResponse } from "next/server";
import Whop from "@whop/sdk";
import { getServiceById, getPrice, getUnitPriceForQuantity, retainerBuildDiscount } from "@/data/services";
import type { ServiceMode, ClientTier } from "@/data/services";

// ── Create Whop Checkout from proposal selections ───────────────
// Builds a single checkout configuration with an inline plan whose
// initial_price equals the proposal total. Line-item detail is
// stored in metadata so the webhook can record it.

interface SelectionPayload {
  serviceId: string;
  mode: ServiceMode;
  quantity: number;
}

export async function POST(request: Request) {
  const apiKey = process.env.WHOP_API_KEY;
  const companyId = process.env.WHOP_COMPANY_ID;

  if (!apiKey || !companyId) {
    console.error("[checkout] Missing WHOP_API_KEY or WHOP_COMPANY_ID");
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
  let buildDiscount = 0;
  for (const sel of selections) {
    const d = retainerBuildDiscount[sel.serviceId];
    if (d && d > buildDiscount) buildDiscount = d;
  }

  // ── Build line items & calculate total ─────────────────────
  interface LineItem {
    title: string;
    amountPence: number;
    quantity: number;
  }

  const lineItems: LineItem[] = [];
  let totalPence = 0;

  for (const sel of selections) {
    const service = getServiceById(sel.serviceId);
    if (!service) continue;

    const pricing = service.pricing[sel.mode];
    if (!pricing) continue;

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

    const title =
      sel.mode === "retainer"
        ? `${service.name} (Monthly Retainer)`
        : service.name;

    lineItems.push({ title, amountPence, quantity: sel.quantity });
    totalPence += amountPence * sel.quantity;
  }

  if (lineItems.length === 0) {
    return NextResponse.json(
      { error: "No valid services selected" },
      { status: 400 }
    );
  }

  // ── Create Whop checkout configuration with inline plan ────
  const totalGBP = totalPence / 100;

  // Build a readable description of line items for the checkout page
  const description = lineItems
    .map(
      (li) =>
        `${li.title} x${li.quantity} — £${((li.amountPence * li.quantity) / 100).toFixed(2)}`
    )
    .join("\n");

  const client = new Whop({ apiKey });

  try {
    const checkoutConfig = await client.checkoutConfigurations.create({
      plan: {
        company_id: companyId,
        initial_price: totalGBP,
        renewal_price: 0,
        plan_type: "one_time",
        currency: "gbp",
        title: `Proposal — ${clientName}`.slice(0, 30),
        description: description.slice(0, 500),
        visibility: "hidden",
        release_method: "buy_now",
      },
      mode: "payment",
      metadata: {
        proposal_token: proposalToken,
        client_name: clientName,
        client_email: clientEmail || "",
        pricing_tier: String(tier),
        line_items: JSON.stringify(
          lineItems.map((li) => ({
            title: li.title,
            price: (li.amountPence / 100).toFixed(2),
            quantity: li.quantity,
          }))
        ),
        ...(buildDiscount > 0 && {
          retainer_build_discount: `${Math.round(buildDiscount * 100)}%`,
        }),
      },
      redirect_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://launchpad-peach.vercel.app"}/proposal/${proposalToken}?paid=1`,
    });

    const purchaseUrl = checkoutConfig.purchase_url;

    if (!purchaseUrl) {
      console.error("[checkout] No purchase_url in response:", JSON.stringify(checkoutConfig));
      return NextResponse.json(
        { error: "Checkout created but no purchase URL returned" },
        { status: 502 }
      );
    }

    return NextResponse.json({ invoiceUrl: purchaseUrl });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[checkout] Whop API request failed:", errMsg, err);
    return NextResponse.json(
      { error: "Failed to create checkout", detail: errMsg },
      { status: 502 }
    );
  }
}
