/** Oura Cloud API v2 (OAuth2 + usercollection). */

const OURA_AUTHORIZE = "https://cloud.ouraring.com/oauth/authorize";
const OURA_TOKEN = "https://api.ouraring.com/oauth/token";
const OURA_DAILY_ACTIVITY =
  "https://api.ouraring.com/v2/usercollection/daily_activity";

export function ouraAuthorizeUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const p = new URLSearchParams({
    response_type: "code",
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    scope: "daily",
    state: input.state,
  });
  return `${OURA_AUTHORIZE}?${p.toString()}`;
}

export type OuraTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

export async function ouraExchangeCode(input: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  code: string;
}): Promise<OuraTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: input.redirectUri,
    client_id: input.clientId,
    client_secret: input.clientSecret,
  });
  const res = await fetch(OURA_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Oura token exchange failed (${res.status}): ${t.slice(0, 200)}`);
  }
  return res.json() as Promise<OuraTokenResponse>;
}

export async function ouraRefreshToken(input: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<OuraTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: input.refreshToken,
    client_id: input.clientId,
    client_secret: input.clientSecret,
  });
  const res = await fetch(OURA_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Oura refresh failed (${res.status}): ${t.slice(0, 200)}`);
  }
  return res.json() as Promise<OuraTokenResponse>;
}

type DailyActivityRow = { day?: string; steps?: number };

export async function ouraFetchDailyActivity(input: {
  accessToken: string;
  startDate: string;
  endDate: string;
}): Promise<{ day: string; steps: number }[]> {
  const out: { day: string; steps: number }[] = [];
  let nextToken: string | null = null;

  do {
    const u = new URL(OURA_DAILY_ACTIVITY);
    u.searchParams.set("start_date", input.startDate);
    u.searchParams.set("end_date", input.endDate);
    if (nextToken) u.searchParams.set("next_token", nextToken);

    const res = await fetch(u.toString(), {
      headers: { Authorization: `Bearer ${input.accessToken}` },
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Oura daily_activity failed (${res.status}): ${t.slice(0, 200)}`);
    }
    const json = (await res.json()) as {
      data?: DailyActivityRow[];
      next_token?: string | null;
    };
    for (const row of json.data ?? []) {
      const raw = row.day?.trim() ?? "";
      const day = /^(\d{4}-\d{2}-\d{2})/.exec(raw)?.[1];
      if (!day) continue;
      const steps = typeof row.steps === "number" && Number.isFinite(row.steps) ? row.steps : 0;
      out.push({ day, steps: Math.max(0, Math.round(steps)) });
    }
    nextToken = json.next_token ?? null;
  } while (nextToken);

  return out;
}
