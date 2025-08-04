import { NextResponse, NextRequest } from "next/server";
import { google } from "googleapis";
import * as XLSX from "xlsx";
import { cookies } from "next/headers";

// Google Drive에서 다운로드한 Stream을 Buffer로 변환하는 헬퍼 함수
async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

// Google Sheets API를 사용하여 셀 값 읽기
async function readGoogleSheetCell(drive: any, sheets: any, fileId: string, cellAddress: string): Promise<any> {
  try {
    // Google Sheets인 경우 Sheets API 사용
    console.log(`Reading Google Sheet cell ${cellAddress} from file ${fileId}`);

    // 셀 주소를 A1 표기법으로 변환 (예: A1, B2, C10)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: fileId,
      range: cellAddress,
      valueRenderOption: "FORMATTED_VALUE",
      dateTimeRenderOption: "FORMATTED_STRING",
    });

    const values = response.data.values;
    const cellValue = values && values[0] && values[0][0] ? values[0][0] : null;

    return {
      cellAddress,
      value: cellValue,
      rawValue: cellValue,
      formattedValue: cellValue,
      method: "sheets_api",
    };
  } catch (error) {
    console.error("Error reading Google Sheet:", error);
    throw error;
  }
}

// Excel 파일을 다운로드하여 셀 값 읽기
async function readExcelFileCell(drive: any, fileId: string, cellAddress: string, sheetName?: string): Promise<any> {
  try {
    console.log(`Downloading and reading Excel file ${fileId}, cell ${cellAddress}`);

    // 파일 다운로드
    const fileResponse = await drive.files.get({ fileId, alt: "media" }, { responseType: "stream" });

    const buffer = await streamToBuffer(fileResponse.data);
    const workbook = XLSX.read(buffer, { type: "buffer" });

    // 시트 선택 (지정된 시트명이 있으면 사용, 없으면 첫 번째 시트)
    const targetSheetName = sheetName && workbook.SheetNames.includes(sheetName) ? sheetName : workbook.SheetNames[0];

    if (!targetSheetName) {
      throw new Error("시트를 찾을 수 없습니다.");
    }

    const worksheet = workbook.Sheets[targetSheetName];
    if (!worksheet) {
      throw new Error(`시트 '${targetSheetName}'를 찾을 수 없습니다.`);
    }

    // 셀 값 읽기
    const cell = worksheet[cellAddress];
    const cellValue = cell ? cell.v : null;
    const formattedValue = cell ? cell.w || cell.v : null;

    return {
      cellAddress,
      sheetName: targetSheetName,
      availableSheets: workbook.SheetNames,
      value: cellValue,
      rawValue: cellValue,
      formattedValue: formattedValue,
      cellType: cell ? cell.t : null,
      method: "excel_download",
    };
  } catch (error) {
    console.error("Error reading Excel file:", error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { fileId, cellAddress, sheetName, source, sharedDriveId } = await request.json();

    if (!fileId || !cellAddress) {
      return NextResponse.json(
        {
          error: "파일 ID와 셀 주소가 필요합니다.",
          required: ["fileId", "cellAddress"],
          example: {
            fileId: "1ABC123...",
            cellAddress: "A1",
            sheetName: "Sheet1 (optional)",
            source: "personal or shared_drive (optional)",
            sharedDriveId: "shared drive id (optional)",
          },
        },
        { status: 400 }
      );
    }

    // // 1. 서비스 계정 인증 정보 로드
    // if (!process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS) {
    //   throw new Error("Google service account credentials are not set.");
    // }
    // const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS);

    // // 2. Google Drive API 클라이언트 인증
    // const auth = new google.auth.GoogleAuth({
    //   credentials,
    //   scopes: [
    //     "https://www.googleapis.com/auth/drive.readonly",
    //     "https://www.googleapis.com/auth/spreadsheets.readonly"
    //   ],
    // });

    const cookieStore = await cookies();
    const accessToken = cookieStore.get("google_access_token")?.value;

    if (!accessToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);

    oauth2Client.setCredentials({ access_token: accessToken });

    const drive = google.drive({ version: "v3", auth: oauth2Client });

    // const drive = google.drive({ version: "v3", auth });
    const sheets = google.sheets({ version: "v4", auth: oauth2Client });

    // 3. 파일 정보 조회
    let fileInfo;
    try {
      let getOptions: any = {
        fileId,
        fields: "id, name, mimeType, size, modifiedTime, webViewLink",
      };

      // 공유 드라이브인 경우 추가 옵션
      if (source === "shared_drive") {
        getOptions.supportsAllDrives = true;
      }

      fileInfo = await drive.files.get(getOptions);
    } catch (error) {
      return NextResponse.json(
        {
          error: "파일을 찾을 수 없습니다.",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 404 }
      );
    }

    console.log(`Reading cell ${cellAddress} from file: ${fileInfo.data.name} (${fileInfo.data.mimeType})`);

    // 4. 파일 타입에 따라 적절한 방법으로 셀 값 읽기
    let cellData;

    if (fileInfo.data.mimeType === "application/vnd.google-apps.spreadsheet") {
      // Google Sheets인 경우
      cellData = await readGoogleSheetCell(drive, sheets, fileId, cellAddress);
    } else if (fileInfo.data.mimeType === "application/vnd.ms-excel" || fileInfo.data.mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
      // Excel 파일인 경우
      cellData = await readExcelFileCell(drive, fileId, cellAddress, sheetName);
    } else {
      return NextResponse.json(
        {
          error: "지원하지 않는 파일 형식입니다.",
          supportedTypes: ["application/vnd.google-apps.spreadsheet", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
          actualType: fileInfo.data.mimeType,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      fileInfo: {
        id: fileInfo.data.id,
        name: fileInfo.data.name,
        mimeType: fileInfo.data.mimeType,
        size: fileInfo.data.size,
        modifiedTime: fileInfo.data.modifiedTime,
        webViewLink: fileInfo.data.webViewLink,
      },
      cellData,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error("Error reading cell value:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        error: "셀 값 읽기 중 오류가 발생했습니다.",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
