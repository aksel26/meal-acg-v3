import { google } from "googleapis";
import { JWT } from "google-auth-library";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;
const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;

let sheets: any = null;

const initializeGoogleSheets = () => {
  if (GOOGLE_CLIENT_EMAIL && GOOGLE_PRIVATE_KEY) {
    const jwtClient = new JWT({
      email: GOOGLE_CLIENT_EMAIL.replace(/\\n/g, "\n"),
      key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      scopes: SCOPES,
    });
    console.log("jwtClient: ", jwtClient);

    return google.sheets({ version: "v4", auth: jwtClient });
  }
  return null;
};

if (typeof window === "undefined") {
  sheets = initializeGoogleSheets();
}

export { sheets, initializeGoogleSheets };
// JWT 클라이언트 생성
