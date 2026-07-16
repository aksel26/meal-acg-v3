import "server-only";
import { createHash } from "node:crypto";

type RpcClient = {
  rpc: (
    functionName: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: unknown }>;
};

function getClientAddress(request: Request) {
  // ponytail: trusts x-real-ip, which the hosting proxy (Vercel) sets and
  // overwrites. Behind a different proxy, set the correct trusted header here —
  // do NOT re-add client-settable headers (cf-connecting-ip, leftmost
  // x-forwarded-for) unless a trusted CDN actually populates them, or the
  // address limit becomes spoofable.
  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function hashKey(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function consumeRateLimit(
  client: RpcClient,
  request: Request,
  scope: string,
  options: { limit: number; windowSeconds: number; subject?: string },
) {
  // Account-scoped buckets (subject set) key on the subject alone so the cap is
  // truly per-account; without a subject, fall back to the client address.
  // Mixing the address into the account bucket would make it per-(IP, account),
  // which a distributed/IP-rotating attacker bypasses.
  const identifier = options.subject?.trim().toLowerCase() || getClientAddress(request);
  const rateKey = `${scope}:${hashKey(identifier)}`;
  const { data, error } = await client.rpc("consume_auth_rate_limit", {
    p_key: rateKey,
    p_limit: options.limit,
    p_window_seconds: options.windowSeconds,
  });
  // Fail open: this sits on the login critical path, so a rate-limit backend
  // error (e.g. migration not yet applied) must not take down authentication.
  if (error) {
    console.error("consume_auth_rate_limit failed; allowing request:", error);
    return true;
  }
  return data === true;
}
