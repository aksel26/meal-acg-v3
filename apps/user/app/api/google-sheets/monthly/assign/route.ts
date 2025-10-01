import { NextRequest, NextResponse } from "next/server";
import { sheets } from "@/lib/google-config";

interface AssignRequest {
  name: string;
  drink: string;
}

const SHEET_ID = process.env.GOOGLE_SHEET_ID;

export async function POST(request: NextRequest) {
  try {
    if (!SHEET_ID || !sheets) {
      console.warn("Google Sheets configuration not found");
      return NextResponse.json(
        {
          success: false,
          error: "Google Sheets configuration not found",
        },
        { status: 500 }
      );
    }

    const body: AssignRequest = await request.json();
    const { name, drink } = body;

    if (!name || !drink) {
      return NextResponse.json(
        {
          success: false,
          error: "Name and drink are required",
        },
        { status: 400 }
      );
    }

    // 기존 데이터 가져오기 (B7:D 범위)
    const getResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "Monthly 음료취합!B7:D",
    });

    const existingData = getResponse.data.values || [];

    // 사용자 찾기
    let targetRow = -1;
    let isNewEntry = false;

    for (let i = 0; i < existingData.length; i++) {
      if (existingData[i] && existingData[i][0] === name) {
        targetRow = i + 7; // 시트에서 실제 행 번호 (7행부터 시작)
        break;
      }
    }

    // 사용자가 없으면 새로운 행에 추가
    if (targetRow === -1) {
      // 빈 행 찾기
      for (let i = 0; i < existingData.length; i++) {
        if (!existingData[i] || !existingData[i][0]) {
          targetRow = i + 7;
          isNewEntry = true;
          break;
        }
      }

      // 빈 행이 없으면 맨 끝에 추가
      if (targetRow === -1) {
        targetRow = existingData.length + 7;
        isNewEntry = true;
      }
    }

    // 데이터 업데이트 (D열에 음료 저장)
    const updateRange = `Monthly 음료취합!B${targetRow}:C${targetRow}`;
    const values = [
      [
        name, // B열: 이름
        drink, // D열: 음료
      ],
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: updateRange,
      valueInputOption: "RAW",
      requestBody: {
        values,
      },
    });

    return NextResponse.json({
      success: true,
      message: `${name}님의 음료를 "${drink}"로 설정했습니다.`,
      data: {
        name,
        drink,
        row: targetRow,
        isNewEntry,
      },
    });
  } catch (error) {
    console.error("Failed to assign drink:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to assign drink",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
