import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ouraAuthorizeUrl } from "@/lib/oura-api";
import { getOuraOAuthEnv } from "@/lib/oura-sync";

const OURA_STATE_COOKIE = "oura_oauth_state";

export async function GET() {
  const env = getOuraOAuthEnv();
  if (!env) {
    return NextResponse.json(
      { error: "Oura OAuth is not configured (OURA_CLIENT_ID, OURA_CLIENT_SECRET, OURA_REDIRECT_URI)." },
      { status: 503 }
    );
  }

  const state = randomBytes(32).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set(OURA_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  const authorize = ouraAuthorizeUrl({
    clientId: env.clientId,
    redirectUri: env.redirectUri,
    state,
  });

  return NextResponse.redirect(authorize, 302);
}
