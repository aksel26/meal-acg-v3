import { google } from "googleapis";
import { NextRequest } from "next/server";

const calendar = google.calendar("v3");

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const month = Number(searchParams.get("month"));
    
    if (!month || month < 1 || month > 12) {
      return new Response(
        JSON.stringify({ error: "Invalid month parameter. Must be between 1-12." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 공휴일 캘린더 ID (환경 변수 또는 기본값 사용)
    const calendarId = "ko.south_korea.official#holiday@group.v.calendar.google.com";
    const apiKey = process.env.GOOGLE_CALENDAR_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Google Calendar API key not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 시작 및 종료 날짜 (현재 연도 기준)
    const currentYear = new Date().getFullYear();
    const startDate = new Date(currentYear, month - 1, 1).toISOString();
    const endDate = new Date(currentYear, month - 1 + 1, 0).toISOString(); // 해당 월의 마지막 날

    console.log(`Fetching holidays for ${currentYear}-${month}`);
    console.log(`Date range: ${startDate} to ${endDate}`);

    // Google Calendar API를 사용해 이벤트(공휴일) 가져오기
    const response = await calendar.events.list({
      calendarId,
      key: apiKey,
      timeMin: startDate,
      timeMax: endDate,
      singleEvents: true,
      orderBy: "startTime",
    });

    // 공휴일 데이터를 변환해 반환
    const holidays =
      response.data.items?.map((event) => ({
        name: event.summary,
        date: event.start?.date,
      })) || [];

    console.log(`Found ${holidays.length} holidays:`, holidays);

    return new Response(JSON.stringify(holidays), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Google Calendar API Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: "Failed to fetch holidays from Google Calendar API"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}