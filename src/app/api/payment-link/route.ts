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
    recurring?: boolean;
    billingPeriod?: number; // days, default 30
    trialDays?: number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { clientName, clientEmail, amount, description, recurring, billingPeriod, trialDays } = body;

  if (!clientName?.trim() || !amount || amount < 0.5) {
    return NextResponse.json(
      { error: "Client name and amount (min £0.50) are required" },
      { status: 400 }
    );
  }

  const client = new Whop({ apiKey });

  try {
    const isRecurring = !!recurring;

    const planConfig: any = {
      company_id: companyId,
      initial_price: amount,
      currency: "gbp",
      title: `${isRecurring ? "Monthly" : "Payment"} — ${clientName}`.slice(0, 30),
      description: description || `${isRecurring ? "Monthly retainer" : "Payment"} for ${clientName}`,
      visibility: "hidden",
      release_method: "buy_now",
      override_tax_type: "inclusive",
    };

    if (isRecurring) {
      planConfig.plan_type = "renewal";
      planConfig.renewal_price = amount;
      planConfig.billing_period = billingPeriod || 30; // days
      if (trialDays && trialDays > 0) planConfig.trial_period_days = trialDays;
    } else {
      planConfig.plan_type = "one_time";
      planConfig.renewal_price = 0;
    }

    const checkoutConfig = await client.checkoutConfigurations.create({
      plan: planConfig,
      mode: "payment",
      metadata: {
        client_name: clientName,
        client_email: clientEmail || "",
        source: "payment-link-tool",
        plan_type: isRecurring ? "recurring" : "one-time",
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
