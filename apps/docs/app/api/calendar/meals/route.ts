import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { cookies } from "next/headers";
import * as XLSX from "xlsx";

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

  try {
    const personalResponse = await drive.files.list({
      q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: "files(id, name, parents)",
    });

    if (personalResponse.data.files && personalResponse.data.files.length > 0) {
      return personalResponse.data.files[0];
    }

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
    const matchedFiles = files.filter((file: any) => {
      const fileNameWithoutExt = file.name.replace(/\.(xlsx|xls)$/i, "");
      const normalizedFileName = fileNameWithoutExt.normalize("NFC");
      const normalizedUserName = userName.normalize("NFC");
      return normalizedFileName === normalizedUserName;
    });

    return matchedFiles;
  } catch (error) {
    console.error("Error finding Excel files:", error);
    return [];
  }
}

interface MealData {
  date: string;
  attendance: string; // H열 - 근태
  lunch?: {
    store: string; // I열 - 상호명
    amount: number; // J열 - 금액
    payer: string; // L열 - 비고(결제자)
  };
  dinner?: {
    store: string; // M열 - 상호명
    amount: number; // N열 - 금액
    payer: string; // O열 - 비고(결제자)
  };
  breakfast?: {
    store: string; // P열 - 상호명
    amount: number; // Q열 - 금액
    payer: string; // R열 - 비고(결제자)
  };
}

async function getMealDataFromExcel(drive: any, fileId: string, targetYear: number, targetMonth: number, targetDay?: number): Promise<MealData[]> {
  try {
    const fileResponse = await drive.files.get(
      {
        fileId: fileId,
        alt: "media",
      },
      {
        responseType: "stream",
      }
    );

    const buffer = await streamToBuffer(fileResponse.data);
    const workbook = XLSX.read(buffer, { type: "buffer" });

    const targetSheetName = workbook.SheetNames.includes("내역") ? "내역" : workbook.SheetNames[0];
    if (!targetSheetName) return [];

    const worksheet = workbook.Sheets[targetSheetName];
    if (!worksheet) return [];

    // B,C,D열: 연도,월,일 / H열: 근태 / I~R열: 각 식사 데이터
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: "B3:R204" });

    const mealData: MealData[] = [];

    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i] as any[];
      const year = parseInt(row[0]) || 0; // B열 (연도)
      const month = parseInt(row[1]) || 0; // C열 (월)
      const day = parseInt(row[2]) || 0; // D열 (일)

      // 날짜 필터링
      if (year === targetYear && month === targetMonth && (targetDay === undefined || day === targetDay)) {
        const attendance = row[6] || ""; // H열 (근태)
        const dateString = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

        const meal: MealData = {
          date: dateString,
          attendance: attendance,
        };

        // 중식 데이터 (I, J, L열)
        const lunchStore = row[7] || ""; // I열
        const lunchAmount = parseFloat(row[8]) || 0; // J열
        const lunchPayer = row[10] || ""; // L열
        if (lunchStore || lunchAmount || lunchPayer) {
          meal.lunch = {
            store: lunchStore,
            amount: lunchAmount,
            payer: lunchPayer,
          };
        }

        // 석식 데이터 (M, N, O열)
        const dinnerStore = row[11] || ""; // M열
        const dinnerAmount = parseFloat(row[12]) || 0; // N열
        const dinnerPayer = row[13] || ""; // O열
        if (dinnerStore || dinnerAmount || dinnerPayer) {
          meal.dinner = {
            store: dinnerStore,
            amount: dinnerAmount,
            payer: dinnerPayer,
          };
        }

        // 조식 데이터 (P, Q, R열)
        const breakfastStore = row[14] || ""; // P열
        const breakfastAmount = parseFloat(row[15]) || 0; // Q열
        const breakfastPayer = row[16] || ""; // R열
        if (breakfastStore || breakfastAmount || breakfastPayer) {
          meal.breakfast = {
            store: breakfastStore,
            amount: breakfastAmount,
            payer: breakfastPayer,
          };
        }

        mealData.push(meal);
      }
    }

    return mealData;
  } catch (error) {
    console.error("Error getting meal data from Excel:", error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date"); // YYYY-MM-DD format
    const month = searchParams.get("month"); // MM format for month view
    const name = searchParams.get("name");

    if (!name) {
      return NextResponse.json({ error: "Name parameter is required" }, { status: 400 });
    }

    if (!date && !month) {
      return NextResponse.json({ error: "Either date or month parameter is required" }, { status: 400 });
    }

    const authResult = await getAuthClient();
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const drive = google.drive({ version: "v3", auth: authResult });

    let targetYear: number;
    let targetMonth: number;
    let targetDay: number | undefined;

    if (date) {
      const [year, monthStr, dayStr] = date.split("-");
      targetYear = parseInt(year || "");
      targetMonth = parseInt(monthStr || "");
      targetDay = parseInt(dayStr || "");
    } else if (month) {
      targetYear = new Date().getFullYear();
      targetMonth = parseInt(month);
    } else {
      return NextResponse.json({ error: "Invalid date parameters" }, { status: 400 });
    }

    // 폴더 찾기
    const folder = await findSemesterFolder(drive, targetMonth);
    if (!folder) {
      return NextResponse.json({ error: "Semester folder not found" }, { status: 404 });
    }

    // 엑셀 파일 찾기
    const files = await findExcelFiles(drive, folder.id, name);
    if (files.length === 0) {
      return NextResponse.json({ error: "Excel file not found" }, { status: 404 });
    }

    // 식사 데이터 가져오기
    for (const file of files) {
      if (file.mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || file.mimeType === "application/vnd.ms-excel") {
        const mealData = await getMealDataFromExcel(drive, file.id, targetYear, targetMonth, targetDay);

        if (mealData.length > 0) {
          return NextResponse.json({
            success: true,
            data: mealData,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: [],
    });
  } catch (error) {
    console.error("Calendar meals API error:", error);
    return NextResponse.json({ error: "Failed to fetch meal data", details: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
