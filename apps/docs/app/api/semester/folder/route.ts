import { NextResponse } from "next/server";
import { google } from "googleapis";
import { cookies } from "next/headers";

// 현재 날짜 기준으로 년도와 반기를 계산하는 함수
function getCurrentSemesterInfo() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 0-based이므로 +1

  // 1~6월: 상반기, 7~12월: 하반기
  const semester = month <= 6 ? "상반기" : "하반기";
  const folderName = `${year}년 ${semester}`;

  return {
    year,
    semester,
    folderName,
    month,
  };
}

export async function GET() {
  try {
    // 1. 서비스 계정 인증 정보 로드
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("google_access_token")?.value;

    if (!accessToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);

    oauth2Client.setCredentials({ access_token: accessToken });

    const drive = google.drive({ version: "v3", auth: oauth2Client });

    // 3. 현재 년도와 반기 정보 계산
    const semesterInfo = getCurrentSemesterInfo();
    console.log("Looking for folder:", semesterInfo.folderName);

    // 4. 폴더 검색 (개인 드라이브와 공유 드라이브 모두 검색)
    const personalFolders = await drive.files.list({
      q: `name='${semesterInfo.folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: "files(id, name, parents, webViewLink)",
      pageSize: 10,
    });

    // 5. 공유 드라이브에서도 검색
    const sharedDrivesResponse = await drive.drives.list({
      fields: "drives(id, name)",
    });

    const sharedDrives = sharedDrivesResponse.data.drives || [];
    let sharedDriveFolders: any[] = [];

    for (const sharedDrive of sharedDrives) {
      try {
        if (!sharedDrive.id) continue;

        const driveSearch = await drive.files.list({
          corpora: "drive" as const,
          driveId: sharedDrive.id,
          includeItemsFromAllDrives: true,
          supportsAllDrives: true,
          q: `name='${semesterInfo.folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
          fields: "files(id, name, parents, webViewLink)",
          pageSize: 10,
        });

        const folders = driveSearch.data.files || [];
        sharedDriveFolders = sharedDriveFolders.concat(
          folders.map((folder) => ({
            ...folder,
            sharedDriveName: sharedDrive.name,
            sharedDriveId: sharedDrive.id,
          }))
        );
      } catch (error) {
        console.warn(`Error searching in shared drive ${sharedDrive.name}:`, error);
      }
    }

    // 6. 모든 찾은 폴더 합치기
    const allFolders = [
      ...(personalFolders.data.files || []).map((folder) => ({
        ...folder,
        source: "personal" as const,
      })),
      ...sharedDriveFolders.map((folder) => ({
        ...folder,
        source: "shared_drive" as const,
      })),
    ];

    console.log(`Found ${allFolders.length} folders matching '${semesterInfo.folderName}'`);

    return NextResponse.json({
      success: true,
      semesterInfo,
      foundFolders: allFolders.length,
      folders: allFolders.map((folder) => ({
        id: folder.id,
        name: folder.name,
        webViewLink: folder.webViewLink,
        parents: folder.parents,
        source: folder.source,
        sharedDriveName: folder.sharedDriveName,
        sharedDriveId: folder.sharedDriveId,
      })),
    });
  } catch (error: unknown) {
    console.error("Error finding semester folder:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        error: "반기 폴더 검색 중 오류가 발생했습니다.",
        details: errorMessage,
        semesterInfo: getCurrentSemesterInfo(),
      },
      { status: 500 }
    );
  }
}
