export const runtime = "nodejs"; // 또는 'nodejs'
export const dynamic = "force-dynamic";

import { sheets } from "@/lib/google-config";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "점심조!A1:Z",
    });

    const { values } = response.data;

    // 변수화

    if (!values || values.length < 4) {
      throw new Error("Invalid data format: values are missing or insufficient.");
    }
    const [totalMembers, membersPerGroup, prevDate, nextDate] = values[3];
    const mondayMember = values[3][5];
    const fridayMember = values[4][5];

    // const [totalMembers, membersPerGroup, prevDate, nextDate] = values[4];

    // '조'와 '인원' 정보 변환
    const groups = values.slice(6).map((group: any) => ({
      groupNumber: group[0],
      person: group.slice(1),
    }));

    return NextResponse.json(
      {
        success: true,
        message: "점심조 조회 성공",
        result: {
          totalMembers,
          membersPerGroup,
          prevDate,
          nextDate,
          groups,
          mondayMember,
          fridayMember,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : "An unknown error occurred",
      },
      { status: 500 }
    );
  }
}
