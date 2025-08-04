import { NextResponse, NextRequest } from "next/server";
import { google } from "googleapis";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const { folderId, fileName, source, sharedDriveId } = await request.json();

    if (!folderId || !fileName) {
      return NextResponse.json(
        {
          error: "폴더 ID와 파일명이 필요합니다.",
          required: ["folderId", "fileName"],
        },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const accessToken = cookieStore.get("google_access_token")?.value;

    if (!accessToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);

    oauth2Client.setCredentials({ access_token: accessToken });

    const drive = google.drive({ version: "v3", auth: oauth2Client });

    console.log(`Searching for Excel file '${fileName}' in folder ${folderId}`);

    // 3. 엑셀 파일 검색 쿼리 구성
    // Excel 파일 MIME 타입들
    const excelMimeTypes = [
      "application/vnd.ms-excel", // .xls
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.google-apps.spreadsheet", // Google Sheets
    ];

    // 파일명과 MIME 타입으로 검색 (확장자 포함/불포함 모두 고려)
    const queries = [
      `name='${fileName}' and '${folderId}' in parents and trashed=false`,
      `name='${fileName}.xlsx' and '${folderId}' in parents and trashed=false`,
      `name='${fileName}.xls' and '${folderId}' in parents and trashed=false`,
      `name contains '${fileName}' and '${folderId}' in parents and trashed=false and (${excelMimeTypes.map((type) => `mimeType='${type}'`).join(" or ")})`,
    ];

    let foundFiles: any[] = [];

    // 4. 각 쿼리로 파일 검색
    for (const query of queries) {
      try {
        let searchOptions: any = {
          q: query,
          fields: "files(id, name, mimeType, size, modifiedTime, createdTime, webViewLink, parents)",
          pageSize: 50,
        };

        // 공유 드라이브인 경우 추가 옵션 설정
        if (source === "shared_drive" && sharedDriveId) {
          searchOptions = {
            ...searchOptions,
            corpora: "drive" as const,
            driveId: sharedDriveId,
            includeItemsFromAllDrives: true,
            supportsAllDrives: true,
          };
        }

        const filesResponse = await drive.files.list(searchOptions);
        const files = filesResponse.data.files || [];

        if (files.length > 0) {
          foundFiles = foundFiles.concat(files);
          console.log(`Found ${files.length} files with query: ${query}`);
        }
      } catch (searchError) {
        console.warn(`Error with query "${query}":`, searchError);
      }
    }

    // 5. 중복 제거 (ID 기준)
    const uniqueFiles = foundFiles.reduce((acc, file) => {
      if (!acc.find((f: any) => f.id === file.id)) {
        acc.push(file);
      }
      return acc;
    }, []);

    // 6. 정확한 매칭 우선순위 적용
    const sortedFiles = uniqueFiles.sort((a: any, b: any) => {
      // 정확한 이름 매칭이 우선
      const aExactMatch = a.name === fileName || a.name === `${fileName}.xlsx` || a.name === `${fileName}.xls`;
      const bExactMatch = b.name === fileName || b.name === `${fileName}.xlsx` || b.name === `${fileName}.xls`;

      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;

      // 수정 시간 최신순
      return new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime();
    });

    console.log(`Total unique files found: ${uniqueFiles.length}`);

    return NextResponse.json({
      success: true,
      searchCriteria: {
        folderId,
        fileName,
        source,
        sharedDriveId,
      },
      foundFiles: sortedFiles.length,
      files: sortedFiles.map((file: any) => ({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        size: file.size,
        modifiedTime: file.modifiedTime,
        createdTime: file.createdTime,
        webViewLink: file.webViewLink,
        parents: file.parents,
        isExactMatch: file.name === fileName || file.name === `${fileName}.xlsx` || file.name === `${fileName}.xls`,
      })),
    });
  } catch (error: unknown) {
    console.error("Error searching for Excel files:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        error: "엑셀 파일 검색 중 오류가 발생했습니다.",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
