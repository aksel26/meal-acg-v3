import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// Google Calendar API for Korean holidays
const GOOGLE_CALENDAR_ID = "ko.south_korea%23holiday%40group.v.calendar.google.com";

interface GoogleCalendarEvent {
  summary: string;
  start: {
    date: string;
  };
}

interface GoogleCalendarResponse {
  items: GoogleCalendarEvent[];
}

// POST /api/holidays/sync - Sync holidays from Google Calendar
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const body = await request.json();
    const { year } = body;

    if (!year) {
      return NextResponse.json({ error: "year is required" }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_CALENDAR_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Google Calendar API key not configured" },
        { status: 500 }
      );
    }

    // Fetch holidays from Google Calendar
    const timeMin = `${year}-01-01T00:00:00Z`;
    const timeMax = `${year}-12-31T23:59:59Z`;
    const url = `https://www.googleapis.com/calendar/v3/calendars/${GOOGLE_CALENDAR_ID}/events?key=${apiKey}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true`;

    const response = await fetch(url);
    if (!response.ok) {
      console.error("Failed to fetch from Google Calendar:", await response.text());
      return NextResponse.json(
        { error: "Failed to fetch from Google Calendar" },
        { status: 500 }
      );
    }

    const calendarData: GoogleCalendarResponse = await response.json();
    const holidays = calendarData.items
      .filter((event) => event.start?.date)
      .map((event) => ({
        holiday_date: event.start.date,
        description: event.summary,
      }));

    if (holidays.length === 0) {
      return NextResponse.json({ count: 0, message: "No holidays found" });
    }

    // Upsert holidays to database
    const { error } = await supabase
      .from("holidays")
      .upsert(holidays, { onConflict: "holiday_date" });

    if (error) {
      console.error("Error syncing holidays:", error);
      return NextResponse.json({ error: "Failed to sync holidays" }, { status: 500 });
    }

    return NextResponse.json({
      count: holidays.length,
      message: `${holidays.length} holidays synced successfully`,
    });
  } catch (error) {
    console.error("Holiday sync error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
