export const COMPANY_DOCUMENT_CATEGORIES = [
  "policy",
  "hr",
  "finance",
  "operations",
  "forms",
  "other",
] as const;

export const COMPANY_DOCUMENT_CATEGORY_LABELS: Record<
  (typeof COMPANY_DOCUMENT_CATEGORIES)[number],
  string
> = {
  policy: "규정",
  hr: "인사",
  finance: "재무",
  operations: "운영",
  forms: "서식",
  other: "기타",
};

export const OPERATION_DEFAULT_PAGE_SIZE = 50;
export const OPERATION_MAX_PAGE_SIZE = 100;

export class OperationInputError extends Error {}

const DOCUMENT_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const RECEIPT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const SENSITIVE_CARD_KEYS = new Set([
  "cardNumber",
  "card_number",
  "fullNumber",
  "full_number",
  "pan",
  "pin",
  "cvc",
  "cvv",
  "magneticData",
  "magnetic_data",
]);

export function operationText(
  value: unknown,
  label: string,
  options: { required?: boolean; max?: number } = {},
) {
  const text = typeof value === "string" ? value.trim() : "";
  if (options.required && !text)
    throw new OperationInputError(`${label}을(를) 입력해주세요.`);
  if (text.length > (options.max ?? 2000)) {
    throw new OperationInputError(`${label}이(가) 너무 깁니다.`);
  }
  return text;
}

export function operationDate(
  value: unknown,
  label: string,
  required?: true,
): string;
export function operationDate(
  value: unknown,
  label: string,
  required: false,
): string | null;
export function operationDate(value: unknown, label: string, required = true) {
  const date = operationText(value, label);
  if (!date && !required) return null;
  if (!isOperationDate(date)) {
    throw new OperationInputError(`${label}을(를) 확인해주세요.`);
  }
  return date;
}

export function isOperationDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year === 0) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() + 1 === month &&
    parsed.getUTCDate() === day
  );
}

export function operationPage(searchParams: URLSearchParams) {
  const requestedPage = Number(searchParams.get("page"));
  const requestedPageSize = Number(searchParams.get("pageSize"));
  const page =
    Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;
  const pageSize =
    Number.isSafeInteger(requestedPageSize) && requestedPageSize > 0
      ? Math.min(requestedPageSize, OPERATION_MAX_PAGE_SIZE)
      : OPERATION_DEFAULT_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  return { page, pageSize, from, to: from + pageSize };
}

export function operationPageData<T>(
  rows: T[] | null,
  pagination: ReturnType<typeof operationPage>,
) {
  const data = rows ?? [];
  return {
    items: data.slice(0, pagination.pageSize),
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      hasMore: data.length > pagination.pageSize,
    },
  };
}

export function operationSearch(searchParams: URLSearchParams, name = "q") {
  return operationText(searchParams.get(name), "검색어", { max: 100 }).replace(
    /[%_,().]/g,
    "",
  );
}

export function assertOperationDateRange(
  startDate: string,
  endDate: string | null,
) {
  if (endDate && endDate < startDate) {
    throw new Error("종료일은 시작일보다 빠를 수 없습니다.");
  }
}

export function operationAmount(value: unknown, label: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`${label}은(는) 0보다 커야 합니다.`);
  }
  return amount;
}

export function assertSafeCorporateCardPayload(body: Record<string, unknown>) {
  for (const key of Object.keys(body)) {
    if (SENSITIVE_CARD_KEYS.has(key)) {
      throw new Error("전체 카드번호, PIN, CVC/CVV는 저장할 수 없습니다.");
    }
  }
  if (
    "lastFour" in body &&
    !/^\d{4}$/.test(operationText(body.lastFour, "카드 끝 4자리"))
  ) {
    throw new Error("카드 끝 4자리는 숫자 4자리여야 합니다.");
  }
}

export async function validateOperationFile(
  file: {
    size: number;
    type: string;
    slice(
      start?: number,
      end?: number,
    ): { arrayBuffer(): Promise<ArrayBuffer> };
  },
  kind: "document" | "receipt",
) {
  const maxSize = kind === "document" ? 20 * 1024 * 1024 : 10 * 1024 * 1024;
  const allowedTypes = kind === "document" ? DOCUMENT_TYPES : RECEIPT_TYPES;
  if (file.size <= 0 || file.size > maxSize) {
    return `${kind === "document" ? "자료" : "영수증"} 파일은 ${maxSize / 1024 / 1024}MB 이하만 업로드할 수 있습니다.`;
  }
  if (!allowedTypes.has(file.type)) {
    return `허용되지 않는 ${kind === "document" ? "자료" : "영수증"} 파일 형식입니다.`;
  }
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (!matchesOperationFileSignature(file.type, header)) {
    return `파일 내용과 ${kind === "document" ? "자료" : "영수증"} 형식이 일치하지 않습니다.`;
  }
  return null;
}

function matchesOperationFileSignature(type: string, header: Uint8Array) {
  if (type === "text/plain") return true;
  if (type === "application/pdf") {
    return matchesHeader(header, [0x25, 0x50, 0x44, 0x46, 0x2d]);
  }
  if (type === "image/jpeg") {
    return matchesHeader(header, [0xff, 0xd8, 0xff]);
  }
  if (type === "image/png") {
    return matchesHeader(
      header,
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    );
  }
  if (type === "image/webp") {
    return (
      matchesHeader(header, [0x52, 0x49, 0x46, 0x46]) &&
      matchesHeader(header, [0x57, 0x45, 0x42, 0x50], 8)
    );
  }
  if (
    type.includes("openxmlformats-officedocument") ||
    type === "application/vnd.ms-excel" ||
    type === "application/vnd.ms-powerpoint"
  ) {
    return (
      matchesHeader(header, [0x50, 0x4b, 0x03, 0x04]) ||
      matchesHeader(header, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
    );
  }
  if (type === "application/msword") {
    return matchesHeader(
      header,
      [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1],
    );
  }
  return false;
}

function matchesHeader(header: Uint8Array, signature: number[], offset = 0) {
  return (
    header.length >= offset + signature.length &&
    signature.every((byte, index) => header[offset + index] === byte)
  );
}

export function safeStorageExtension(contentType: string) {
  return (
    {
      "application/pdf": "pdf",
      "application/msword": "doc",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        "docx",
      "application/vnd.ms-excel": "xls",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
        "xlsx",
      "application/vnd.ms-powerpoint": "ppt",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation":
        "pptx",
      "text/plain": "txt",
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    }[contentType] ?? "bin"
  );
}
