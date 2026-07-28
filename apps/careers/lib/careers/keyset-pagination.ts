export const KEYSET_PAGE_SIZE = 1_000;
export const POSTING_STAGE_BATCH_SIZE = 50;

export async function collectKeysetPages<T extends { id: string }>(
  fetchPage: (cursor: string | null) => Promise<T[]>,
  pageSize = KEYSET_PAGE_SIZE,
) {
  const rows: T[] = [];
  let cursor: string | null = null;

  while (true) {
    const page = await fetchPage(cursor);
    rows.push(...page);
    if (page.length < pageSize) return rows;

    const nextCursor = page[page.length - 1]?.id;
    if (!nextCursor || nextCursor === cursor) {
      throw new Error("Keyset pagination cursor did not advance.");
    }
    cursor = nextCursor;
  }
}

export function chunkValues<T>(values: T[], size: number) {
  const chunks: T[][] = [];
  for (let offset = 0; offset < values.length; offset += size) {
    chunks.push(values.slice(offset, offset + size));
  }
  return chunks;
}
