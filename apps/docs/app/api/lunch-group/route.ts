export const runtime = "nodejs"; // 또는 'nodejs'
export const dynamic = "force-dynamic";

import { sheets } from "@/lib/google-config";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // 1. 메타데이터와 값 데이터 모두 가져오기

    const [valuesResponse, gridResponse] = await Promise.all([
      sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: "점심조!A1:Z",
      }),
      sheets.spreadsheets.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        ranges: ["점심조!B7:Z30"], // B7부터 색칠된 셀 탐색
        includeGridData: true,
      }),
    ]);

    const { values } = valuesResponse.data;

    if (!values || values.length < 4) {
      throw new Error(
        "Invalid data format: values are missing or insufficient."
      );
    }

    const [totalMembers, membersPerGroup, prevDate, nextDate] = values[3];
    const mondayMember = values[3][5];
    const fridayMember = values[4][5];

    // 2. B7부터 색칠된 셀 탐색 및 행별 색칠된 셀 개수 계산
    const gridData = gridResponse.data.sheets?.[0]?.data?.[0];
    const coloredCells: Array<{ row: number; col: number }> = [];
    const coloredCellsByRow: Map<number, number> = new Map(); // 각 행의 색칠된 셀 개수

    if (gridData?.rowData) {
      gridData.rowData.forEach((row: any, rowIndex: number) => {
        let coloredCellsInRow = 0;
        row.values?.forEach((cell: any, colIndex: number) => {
          const backgroundColor = cell.userEnteredFormat?.backgroundColor;
          // 흰색이 아닌 색상이 있는 셀 찾기
          if (
            backgroundColor &&
            !(
              backgroundColor.red === 1 &&
              backgroundColor.green === 1 &&
              backgroundColor.blue === 1
            )
          ) {
            const actualRow = rowIndex + 7; // B7부터 시작이므로 7을 더함
            const actualCol = colIndex + 2; // B열부터 시작이므로 2를 더함 (A=1, B=2)

            coloredCells.push({
              row: actualRow,
              col: actualCol,
            });
            coloredCellsInRow++;
          }
        });

        if (coloredCellsInRow > 0) {
          coloredCellsByRow.set(rowIndex + 7, coloredCellsInRow);
        }
      });
    }

    // 3. 그룹 정보 처리 - 색칠된 셀 개수에 맞춰 person 배열 조정
    console.log("values:", values);
    console.log("coloredCellsByRow:", coloredCellsByRow);

    const groups = values.slice(6).map((group: any, groupIndex: number) => {
      const groupRow = groupIndex + 7; // 실제 스프레드시트 행 번호 (7행부터 시작)
      const coloredCellCount = coloredCellsByRow.get(groupRow) || 0;

      // 기존 person 데이터 (B열부터)
      const existingPersons = group.slice(1) || [];

      // 색칠된 셀 개수만큼 배열 생성
      const adjustedPersons: string[] = [];
      for (let i = 0; i < coloredCellCount; i++) {
        if (i < existingPersons.length && existingPersons[i]) {
          // 값이 있으면 그대로 추가
          adjustedPersons.push(existingPersons[i]);
        } else {
          // 값이 없으면 빈 문자열 추가
          adjustedPersons.push("");
        }
      }

      console.log(
        `그룹 ${group[0]}: 색칠된 셀 ${coloredCellCount}개, 조정된 person:`,
        adjustedPersons
      );

      return {
        groupNumber: group[0],
        person: adjustedPersons,
      };
    });

    console.log(
      `B7부터 색칠된 셀 ${coloredCells.length}개 발견:`,
      coloredCells
    );

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
          coloredCells, // 색칠된 셀 정보 추가
        },
      },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message:
          err instanceof Error ? err.message : "An unknown error occurred",
      },
      { status: 500 }
    );
  }
}
