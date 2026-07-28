import "server-only";

import { randomUUID } from "node:crypto";
import { ApiError } from "@/lib/careers/http";
import { createCareersServiceClient } from "@/lib/supabase/server";

export const CAREERS_FILES_BUCKET = "careers-applicant-files";
const MAX_FILE_BYTES = 20 * 1024 * 1024;

const FILE_TYPES = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
} as const;

export function validateApplicantFileMetadata(file: File) {
  if (!file.size || file.size > MAX_FILE_BYTES) {
    throw new ApiError("파일은 20 MiB 이하여야 합니다.", 400);
  }
  const extension = file.name.split(".").pop()?.toLowerCase();
  const expected = extension
    ? FILE_TYPES[extension as keyof typeof FILE_TYPES]
    : undefined;
  if (!extension || !expected || file.type !== expected) {
    throw new ApiError("파일 확장자와 실제 내용이 일치하지 않습니다.", 400);
  }
  return { contentType: expected, extension };
}

export function validateApplicantFileContent(
  extension: string,
  bytes: Uint8Array,
) {
  if (!matchesContent(extension, bytes)) {
    throw new ApiError("파일 확장자와 실제 내용이 일치하지 않습니다.", 400);
  }
}

function matchesContent(extension: string, bytes: Uint8Array) {
  const starts = (...values: number[]) =>
    values.every((value, index) => bytes[index] === value);
  if (extension === "pdf") return starts(0x25, 0x50, 0x44, 0x46, 0x2d);
  if (extension === "png")
    return starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
  if (extension === "jpg" || extension === "jpeg")
    return starts(0xff, 0xd8, 0xff);
  if (extension === "gif")
    return (
      Buffer.from(bytes.subarray(0, 6)).toString("ascii") === "GIF87a" ||
      Buffer.from(bytes.subarray(0, 6)).toString("ascii") === "GIF89a"
    );
  if (extension === "webp")
    return (
      Buffer.from(bytes.subarray(0, 4)).toString("ascii") === "RIFF" &&
      Buffer.from(bytes.subarray(8, 12)).toString("ascii") === "WEBP"
    );
  if (extension === "doc")
    return (
      starts(0xd0, 0xcf, 0x11, 0xe0) &&
      Buffer.from(bytes).includes(Buffer.from("WordDocument", "utf16le"))
    );
  if (extension === "docx") {
    const buffer = Buffer.from(bytes);
    return (
      starts(0x50, 0x4b) &&
      buffer.includes(Buffer.from("[Content_Types].xml")) &&
      buffer.includes(Buffer.from("word/"))
    );
  }
  return false;
}

export async function uploadApplicantFile(
  applicationId: string,
  bytes: Uint8Array,
  contentType: string,
) {
  const path = `${applicationId}/${randomUUID()}`;
  const { error } = await createCareersServiceClient()
    .storage.from(CAREERS_FILES_BUCKET)
    .upload(path, bytes, { contentType, upsert: false });
  if (error) throw new ApiError("파일을 저장하지 못했습니다.", 500);
  return path;
}
