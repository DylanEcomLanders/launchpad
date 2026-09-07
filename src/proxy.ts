import { type NextRequest, NextResponse } from "next/server";
import { updateV2Session } from "@/lib/v2/supabase/proxy";

/**
 * Next.js 16 request proxy. Scoped to /v2 so 1.0 routes and cookies
 * (`launchpad-role`, `lp_session`) are untouched.
 */
export async function proxy(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/v2")) {
    return NextResponse.next();
  }
  return updateV2Session(request);
}

export const config = {
  matcher: ["/v2", "/v2/:path*"],
};
