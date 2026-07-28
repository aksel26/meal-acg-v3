export async function adminOperationRequest<T = unknown>(
  url: string,
  init?: RequestInit,
) {
  const response = await fetch(url, { cache: "no-store", ...init });
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || "요청에 실패했습니다.");
  return payload;
}

export const today = () => new Date().toISOString().slice(0, 10);
export const formatWon = (value: number | string) =>
  `${Number(value).toLocaleString("ko-KR")}원`;
