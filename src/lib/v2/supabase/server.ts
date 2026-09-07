import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { v2CookieOptions } from "@/lib/v2/supabase/cookie";

export async function createV2ServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("v2 requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookieOptions: v2CookieOptions,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot set cookies. src/proxy.ts refreshes
          // the v2 session on /v2 requests.
        }
      },
    },
  });
}
