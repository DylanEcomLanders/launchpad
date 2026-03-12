import { NextResponse } from "next/server";
import Whop from "@whop/sdk";

export async function POST(request: Request) {
  const apiKey = process.env.WHOP_API_KEY;
  const companyId = process.env.WHOP_COMPANY_ID;

  if (!apiKey || !companyId) {
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 }
    );
  }

  let body: {
    clientName: string;
    clientEmail?: string;
    amount: number;
    description?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { clientName, clientEmail, amount, description } = body;

  if (!clientName?.trim() || !amount || amount < 0.5) {
    return NextResponse.json(
      { error: "Client name and amount (min £0.50) are required" },
      { status: 400 }
    );
  }

  const client = new Whop({ apiKey });

  try {
    const checkoutConfig = await client.checkoutConfigurations.create({
      plan: {
        company_id: companyId,
        initial_price: amount,
        renewal_price: 0,
        plan_type: "one_time",
        currency: "gbp",
        title: `Payment — ${clientName}`.slice(0, 30),
        description: description || `Payment for ${clientName}`,
        visibility: "hidden",
        release_method: "buy_now",
        override_tax_type: "inclusive",
      },
      mode: "payment",
      metadata: {
        client_name: clientName,
        client_email: clientEmail || "",
        source: "payment-link-tool",
      },
    });

    const purchaseUrl = checkoutConfig.purchase_url;

    if (!purchaseUrl) {
      return NextResponse.json(
        { error: "Checkout created but no URL returned" },
        { status: 502 }
      );
    }

    return NextResponse.json({ paymentUrl: purchaseUrl });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[payment-link] Whop API failed:", errMsg);
    return NextResponse.json(
      { error: "Failed to create payment link", detail: errMsg },
      { status: 502 }
    );
  }
}
