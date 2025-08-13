import { google } from "googleapis";
import { JWT } from "google-auth-library";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;
const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;

let sheets: any = null;

if (GOOGLE_CLIENT_EMAIL) {
  const jwtClient = new JWT({
    email: GOOGLE_CLIENT_EMAIL.replace(/\\n/g, "\n"),
    key: GOOGLE_PRIVATE_KEY,
    scopes: SCOPES,
  });

  sheets = google.sheets({ version: "v4", auth: jwtClient });
  console.log("sheets:", sheets);
} else {
  throw new Error("Google 정보가 올바르지 않습니다.");
}

export { sheets };
// JWT 클라이언트 생성
