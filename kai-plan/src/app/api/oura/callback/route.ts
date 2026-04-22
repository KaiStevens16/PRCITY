import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSoloUserId } from "@/lib/solo-user";
import { ouraExchangeCode } from "@/lib/oura-api";
import { getOuraOAuthEnv, syncOuraAllDefaultWindow } from "@/lib/oura-sync";

const OURA_STATE_COOKIE = "oura_oauth_state";

function redirectSteps(request: Request, query: Record<string, string>) {
  const base = new URL("/steps", request.url);
  for (const [k, v] of Object.entries(query)) {
    base.searchParams.set(k, v);
  }
  return NextResponse.redirect(base, 302);
}

export async function GET(request: Request) {
  const env = getOuraOAuthEnv();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError) {
    return redirectSteps(request, { oura_error: oauthError });
  }
  if (!code || !state) {
    return redirectSteps(request, { oura_error: "missing_params" });
  }

  const cookieStore = await cookies();
  const expected = cookieStore.get(OURA_STATE_COOKIE)?.value;
  cookieStore.delete(OURA_STATE_COOKIE);

  if (!expected || expected !== state) {
    return redirectSteps(request, { oura_error: "invalid_state" });
  }

  if (!env) {
    return redirectSteps(request, { oura_error: "not_configured" });
  }

  try {
    const tok = await ouraExchangeCode({
      clientId: env.clientId,
      clientSecret: env.clientSecret,
      redirectUri: env.redirectUri,
      code,
    });

    const supabase = createClient();
    const userId = getSoloUserId();
    const expiresAt = new Date(Date.now() + tok.expires_in * 1000).toISOString();

    const { error } = await supabase.from("oura_connection").upsert(
      {
        user_id: userId,
        access_token: tok.access_token,
        refresh_token: tok.refresh_token,
        expires_at: expiresAt,
      },
      { onConflict: "user_id" }
    );

    if (error) {
      return redirectSteps(request, { oura_error: error.message });
    }

    const full = await syncOuraAllDefaultWindow();
    if ("error" in full) {
      return redirectSteps(request, { oura_error: full.error });
    }
    const q: Record<string, string> = { oura_connected: "1" };
    const d = full.detail;
    if (d.sleep_error) {
      q.oura_sleep_error = encodeURIComponent(d.sleep_error.slice(0, 200));
    }
    if (d.readiness_error) {
      q.oura_readiness_error = encodeURIComponent(d.readiness_error.slice(0, 200));
    }
    if (d.heart_rate_error) {
      q.oura_hr_error = encodeURIComponent(d.heart_rate_error.slice(0, 200));
    }
    return redirectSteps(request, q);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "token_exchange_failed";
    return redirectSteps(request, { oura_error: msg.slice(0, 180) });
  }
}
