const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Vary": "Origin",
};

type Registration = {
  team_lead_name: string;
  team_name: string;
  phone: string;
  email: string;
  preferred_track: "GenAI" | "Agentic AI" | "Open Innovation";
  team_size: number;
  member_2: string | null;
  member_3: string | null;
  member_4: string | null;
};

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extraHeaders },
  });
}

function trimField(value: unknown, label: string): string {
  if (typeof value !== "string") throw new Error(`${label} is required.`);
  const cleaned = value.trim();
  if (!cleaned || cleaned.length > 120) throw new Error(`${label} is invalid.`);
  return cleaned;
}

function getServerKey(): string | null {
  try {
    const keyMap = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}") as Record<string, string>;
    if (keyMap.default) return keyMap.default;
  } catch {
    // Fall through to the platform's legacy server-side key.
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? null;
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serverKey = getServerKey();
  if (!supabaseUrl || !serverKey) return json({ error: "registration_unavailable" }, 503);

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > 12_000) return json({ error: "request_too_large" }, 413);

  let submitted: Record<string, unknown>;
  try {
    const rawBody = await request.text();
    if (rawBody.length > 12_000) return json({ error: "request_too_large" }, 413);
    submitted = JSON.parse(rawBody);
    if (!submitted || typeof submitted !== "object" || Array.isArray(submitted)) {
      return json({ error: "invalid_request" }, 400);
    }
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  // Quietly discard automated submissions that fill the hidden honeypot.
  if (typeof submitted.website === "string" && submitted.website.trim()) {
    return json({ ok: true }, 201);
  }

  const clientIp = request.headers.get("cf-connecting-ip")?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (!clientIp) return json({ error: "registration_unavailable" }, 503);

  const rateLimitResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/take_registration_rate_limit`, {
    method: "POST",
    headers: { apikey: serverKey, "Content-Type": "application/json" },
    body: JSON.stringify({ p_ip_hash: await sha256(clientIp) }),
  });
  if (!rateLimitResponse.ok) return json({ error: "registration_unavailable" }, 503);
  const rateLimitRows = await rateLimitResponse.json();
  const rateLimit = Array.isArray(rateLimitRows) ? rateLimitRows[0] : rateLimitRows;
  if (!rateLimit?.allowed) {
    const retryAfter = Math.max(1, Number(rateLimit?.retry_after_seconds) || 3600);
    return json({ error: "rate_limited" }, 429, { "Retry-After": String(retryAfter) });
  }

  let registration: Registration;
  try {
    const teamSize = Number(submitted.team_size);
    if (!Number.isInteger(teamSize) || teamSize < 1 || teamSize > 4) {
      return json({ error: "invalid_team_size" }, 400);
    }
    const email = typeof submitted.email === "string" ? submitted.email.trim().toLowerCase() : "";
    if (email.length > 254 || !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) {
      return json({ error: "invalid_email" }, 400);
    }
    const phone = typeof submitted.phone === "string" ? submitted.phone.trim() : "";
    if (!/^[+0-9() .-]{7,25}$/.test(phone) || !/\d/.test(phone)) {
      return json({ error: "invalid_phone" }, 400);
    }
    const allowedTracks = ["GenAI", "Agentic AI", "Open Innovation"] as const;
    const preferredTrack = typeof submitted.preferred_track === "string" ? submitted.preferred_track.trim() : "";
    if (!allowedTracks.includes(preferredTrack as typeof allowedTracks[number])) {
      return json({ error: "invalid_preferred_track" }, 400);
    }
    const extraMember = (number: number): string | null => {
      if (teamSize < number) return null;
      return trimField(submitted[`member_${number}`], `Team member ${number}`);
    };
    registration = {
      team_lead_name: trimField(submitted.team_lead_name, "Team lead name"),
      team_name: trimField(submitted.team_name, "Team name"),
      phone,
      email,
      preferred_track: preferredTrack as Registration["preferred_track"],
      team_size: teamSize,
      member_2: extraMember(2),
      member_3: extraMember(3),
      member_4: extraMember(4),
    };
  } catch (error) {
    return json({ error: "invalid_registration", message: error instanceof Error ? error.message : "Check the form details." }, 400);
  }

  const insertResponse = await fetch(`${supabaseUrl}/rest/v1/hackathon_registrations`, {
    method: "POST",
    headers: {
      apikey: serverKey,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(registration),
  });

  if (insertResponse.status === 409) return json({ error: "duplicate_email" }, 409);
  if (!insertResponse.ok) return json({ error: "registration_unavailable" }, 503);
  return json({ ok: true }, 201);
});
