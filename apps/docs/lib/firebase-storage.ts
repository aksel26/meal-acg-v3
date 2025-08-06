import { adminStorage } from "@/firebase/adminConfig";
import { getSemesterInfo } from "./date-utils";

export interface FirebaseFile {
  name: string;
  fullPath: string;
  size: string;
  contentType: string;
  updated: string;
}

export async function findSemesterFolder(month: number, year?: number): Promise<string | null> {
  try {
    const { folderName } = getSemesterInfo(month, year);
    const bucket = adminStorage.bucket();

    console.log(`Looking for semester folder: ${folderName}`);

    // 정확한 폴더명 매칭
    const folderPath = `${folderName}/`;
    const [, , apiResponse] = await bucket.getFiles({
      prefix: folderName,
      delimiter: "/",
      autoPaginate: false,
    });

    const folders = (apiResponse as any)?.prefixes || [];
    const matchedFolder = folders.find((folder: string) => folder === folderPath);

    if (matchedFolder) {
      console.log(`Found semester folder: ${matchedFolder}`);
      return matchedFolder;
    }

    console.log(`Semester folder '${folderName}' not found`);
    return null;
  } catch (error) {
    console.error("Error finding semester folder:", error);
    return null;
  }
}

export async function findExcelFiles(folderPath: string, userName: string): Promise<FirebaseFile[]> {
  try {
    const bucket = adminStorage.bucket();

    console.log(`Searching for Excel files in folder: ${folderPath} for user: ${userName}`);

    const [files] = await bucket.getFiles({
      prefix: folderPath,
    });

    // Excel 파일만 필터링하고 사용자명과 매칭
    const excelFiles = files.filter((file) => {
      const fileName = file.name.replace(folderPath, "");
      const isExcel = fileName.toLowerCase().match(/\.(xlsx|xls)$/);

      if (!isExcel) return false;

      // 확장자를 제외한 파일명이 userName과 정확히 일치하는지 확인
      const fileNameWithoutExt = fileName.replace(/\.(xlsx|xls)$/i, "");
      const normalizedFileName = fileNameWithoutExt.normalize("NFC");
      const normalizedUserName = userName.normalize("NFC");

      return normalizedFileName.includes(normalizedUserName);
    });

    const result: FirebaseFile[] = excelFiles.map((file) => ({
      name: file.name.replace(folderPath, ""),
      fullPath: file.name,
      size: String(file.metadata.size || "0"),
      contentType: file.metadata.contentType || "",
      updated: file.metadata.updated || "",
    }));

    console.log(
      `Found ${result.length} matching Excel files:`,
      result.map((f) => f.name)
    );

    return result;
  } catch (error) {
    console.error("Error finding Excel files:", error);
    return [];
  }
}

export async function downloadFileBuffer(filePath: string): Promise<Buffer> {
  try {
    const bucket = adminStorage.bucket();
    const file = bucket.file(filePath);

    console.log(`Downloading file: ${filePath}`);

    const [exists] = await file.exists();
    if (!exists) {
      throw new Error(`파일을 찾을 수 없습니다: ${filePath}`);
    }

    const [buffer] = await file.download();

    console.log(`Downloaded ${buffer.length} bytes from ${filePath}`);

    return buffer;
  } catch (error) {
    console.error("Error downloading file buffer:", error);
    throw error;
  }
}

export async function uploadFileBuffer(filePath: string, buffer: Buffer): Promise<void> {
  try {
    const bucket = adminStorage.bucket();
    const file = bucket.file(filePath);

    console.log(`Uploading file: ${filePath} (${buffer.length} bytes)`);

    await file.save(buffer, {
      metadata: {
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        cacheControl: "no-cache",
      },
    });

    console.log(`Successfully uploaded file: ${filePath}`);
  } catch (error) {
    console.error("Error uploading file buffer:", error);
    throw error;
  }
}

export async function getSignedUrl(filePath: string, expiresInHours: number = 1): Promise<string> {
  try {
    const bucket = adminStorage.bucket();
    const file = bucket.file(filePath);

    const [exists] = await file.exists();
    if (!exists) {
      throw new Error(`파일을 찾을 수 없습니다: ${filePath}`);
    }

    const [signedUrl] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + expiresInHours * 60 * 60 * 1000,
    });

    return signedUrl;
  } catch (error) {
    console.error("Error getting signed URL:", error);
    throw error;
  }
}
