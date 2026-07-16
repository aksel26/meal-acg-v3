import "server-only";
import { createHash } from "node:crypto";

type RpcClient = {
  rpc: (
    functionName: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: unknown }>;
};

function getClientAddress(request: Request) {
  return (
    request.headers.get("cf-connecting-ip") ||
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
  const address = getClientAddress(request);
  const subject = options.subject?.trim().toLowerCase() || "anonymous";
  const rateKey = `${scope}:${hashKey(`${address}:${subject}`)}`;
  const { data, error } = await client.rpc("consume_auth_rate_limit", {
    p_key: rateKey,
    p_limit: options.limit,
    p_window_seconds: options.windowSeconds,
  });
  if (error) throw error;
  return data === true;
}
