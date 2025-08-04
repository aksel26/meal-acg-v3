import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("google_access_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);

  oauth2Client.setCredentials({ access_token: accessToken });

  const drive = google.drive({ version: "v3", auth: oauth2Client });

  try {
    const searchParams = request.nextUrl.searchParams;
    const pageToken = searchParams.get("pageToken") || undefined;
    const search = searchParams.get("search") || undefined;

    const response = await drive.files.list({
      pageSize: 20,
      pageToken,
      q: search ? `name contains '${search}'` : undefined,
      fields: "nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink, iconLink)",
      orderBy: "modifiedTime desc",
    });

    return NextResponse.json({
      files: response.data.files || [],
      nextPageToken: response.data.nextPageToken,
    });
  } catch (error: any) {
    if (error.code === 401) {
      // 토큰 만료
      cookieStore.delete("google_access_token");
      return NextResponse.json({ error: "Token expired" }, { status: 401 });
    }

    console.error("Drive API error:", error);
    return NextResponse.json({ error: "Failed to fetch files" }, { status: 500 });
  }
}
