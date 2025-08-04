import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { cookies } from "next/headers";
import * as XLSX from "xlsx";

// Google Drive에서 다운로드한 Stream을 Buffer로 변환하는 헬퍼 함수
async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}
async function getAuthClient() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("google_access_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);

  oauth2Client.setCredentials({ access_token: accessToken });

  return oauth2Client;
}

async function findSemesterFolder(drive: any, targetMonth: number) {
  const currentYear = new Date().getFullYear();
  const semester = targetMonth <= 6 ? "상반기" : "하반기";
  const folderName = `${currentYear}년 ${semester}`;

  console.log(`Searching for folder: ${folderName}`);

  try {
    // 개인 드라이브에서 검색
    const personalResponse = await drive.files.list({
      q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: "files(id, name, parents)",
    });

    if (personalResponse.data.files && personalResponse.data.files.length > 0) {
      return personalResponse.data.files[0];
    }

    // 공유 드라이브에서 검색
    const sharedDrivesResponse = await drive.drives.list();
    if (sharedDrivesResponse.data.drives) {
      for (const sharedDrive of sharedDrivesResponse.data.drives) {
        const sharedResponse = await drive.files.list({
          q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
          driveId: sharedDrive.id,
          corpora: "drive",
          includeItemsFromAllDrives: true,
          supportsAllDrives: true,
          fields: "files(id, name, parents)",
        });

        if (sharedResponse.data.files && sharedResponse.data.files.length > 0) {
          return sharedResponse.data.files[0];
        }
      }
    }

    return null;
  } catch (error) {
    console.error("Error finding semester folder:", error);
    return null;
  }
}

async function findExcelFiles(drive: any, folderId: string, userName: string) {
  try {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and (name contains '.xlsx' or name contains '.xls') and trashed=false`,
      fields: "files(id, name, mimeType)",
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
    });

    const files = response.data.files || [];

    // 확장자를 제외한 파일명이 userName과 정확히 일치하는 파일만 필터링 (한글 정규화 포함)
    const matchedFiles = files.filter((file: any) => {
      const fileNameWithoutExt = file.name.replace(/\.(xlsx|xls)$/i, "");

      // 한글 정규화 (NFC)
      const normalizedFileName = fileNameWithoutExt.normalize("NFC");
      const normalizedUserName = userName.normalize("NFC");

      console.log("fileNameWithoutExt:", normalizedFileName);
      console.log("userName:", normalizedUserName);

      return normalizedFileName === normalizedUserName;
    });
    console.log("matchedFiles:", matchedFiles);

    return matchedFiles;
  } catch (error) {
    console.error("Error finding Excel files:", error);
    return [];
  }
}

async function calculateFromExcel(drive: any, fileId: string, targetMonth: number) {
  console.log("fileId:", fileId);
  try {
    // 파일 정보 가져오기
    const fileInfo = await drive.files.get({
      fileId: fileId,
      fields: "id, name, parents, webViewLink",
    });
    console.log("File info:", {
      name: fileInfo.data.name,
      id: fileInfo.data.id,
      parents: fileInfo.data.parents,
      webViewLink: fileInfo.data.webViewLink,
    });

    // Excel 파일 바이너리 데이터 다운로드 (stream 방식)
    const fileResponse = await drive.files.get(
      {
        fileId: fileId,
        alt: "media",
      },
      {
        responseType: "stream",
      }
    );

    // Stream을 Buffer로 변환
    const buffer = await streamToBuffer(fileResponse.data);
    console.log("File download buffer length:", buffer.length);

    const workbook = XLSX.read(buffer, { type: "buffer" });
    console.log("Available sheets:", workbook.SheetNames);

    // 시트 선택 ('내역' 시트가 있으면 사용, 없으면 첫 번째 시트)
    const targetSheetName = workbook.SheetNames.includes("내역") ? "내역" : workbook.SheetNames[0];

    if (!targetSheetName) {
      console.error("No sheets found in workbook");
      return null;
    }

    console.log("Using sheet:", targetSheetName);
    const worksheet = workbook.Sheets[targetSheetName];
    console.log("worksheet:", worksheet);

    if (!worksheet) {
      console.error(`Sheet '${targetSheetName}' not found`);
      return null;
    }

    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: "B4:R204" });
    console.log("jsonData:", jsonData);

    if (!jsonData || jsonData.length <= 1) {
      return null;
    }

    let workDays = 0;
    let holidayWorkDays = 0;
    let vacationDays = 0;
    let totalUsed = 0;
    console.log("👀");
    // 데이터 처리 (B4부터 시작하므로 인덱스 조정)
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i] as any[];
      const month = parseInt(row[1]) || 0; // C열 (월) - B4 기준으로 인덱스 1

      if (month === targetMonth) {
        const workType = row[4] || ""; // F열 (업무일) - B4 기준으로 인덱스 4
        const attendance = row[6] || ""; // H열 (근태) - B4 기준으로 인덱스 6
        const amount = parseFloat(row[8]) || 0; // J열 (사용금액) - B4 기준으로 인덱스 8

        // 근무일 계산
        if (attendance === "근무") {
          workDays++;
        }

        // 휴일근무 계산
        if (workType.includes("휴일")) {
          holidayWorkDays++;
        }

        // 휴가일 계산
        if (attendance.includes("휴무")) {
          vacationDays++;
        }

        // 총 사용금액
        totalUsed += amount;
      }
    }

    const availableAmount = workDays * 10000 + holidayWorkDays * 10000 - vacationDays * 10000;
    const balance = availableAmount - totalUsed;

    return {
      workDays,
      holidayWorkDays,
      vacationDays,
      availableAmount,
      totalUsed,
      balance,
    };
  } catch (error) {
    console.error("Error calculating from Excel:", error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get("month") || "1");
    const name = searchParams.get("name");

    if (!name) {
      return NextResponse.json({ error: "Name parameter is required" }, { status: 400 });
    }

    console.log(`Calculating for month: ${month}, name: ${name}`);

    const authResult = await getAuthClient();
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const drive = google.drive({ version: "v3", auth: authResult });

    // 1. 폴더 찾기
    const folder = await findSemesterFolder(drive, month);
    if (!folder) {
      return NextResponse.json({ error: "Semester folder not found" }, { status: 404 });
    }

    // 2. 엑셀 파일 찾기
    const files = await findExcelFiles(drive, folder.id, name);
    if (files.length === 0) {
      return NextResponse.json({ error: "Excel file not found" }, { status: 404 });
    }

    // 3. 계산 수행
    for (const file of files) {
      if (file.mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || file.mimeType === "application/vnd.ms-excel") {
        const result = await calculateFromExcel(drive, file.id, month);
        console.log("result:", result);
        if (result) {
          return NextResponse.json({
            success: true,
            data: {
              fileName: file.name,
              month,
              ...result,
            },
          });
        }
      }
    }

    return NextResponse.json({ error: "Could not calculate from files" }, { status: 404 });
  } catch (error) {
    console.error("Calculate API error:", error);
    return NextResponse.json({ error: "Failed to calculate", details: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
