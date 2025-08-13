import { sheets } from "@/lib/google-config";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const SHEET_NAME = "점심조";
  try {
    const { userName } = await request.json();
    // const { searchParams } = new URL(request.url);
    // const userName = searchParams.get("userName"); // 예: ?key=value

    // 스프레드시트 데이터 가져오기
    const responseRange = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!A4:B4`,
    });

    const [totalMembers, membersPerGroup] = responseRange.data.values[0].map(Number);

    let maxRows = totalMembers / membersPerGroup;

    // 수정된 최대 열 갯수 계산 로직
    let maxCols = membersPerGroup;
    const remainder = totalMembers % membersPerGroup;
    if (remainder > 0 && remainder < membersPerGroup) {
      maxCols += 1;
      maxRows = Math.floor(totalMembers / membersPerGroup);
    }

    const RANGE = `${SHEET_NAME}!B7:${String.fromCharCode(65 + maxCols)}${6 + maxRows}`;

    // '점심조' 시트에서 배경색이 있는 셀 가져오기
    const response = await sheets.spreadsheets.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      ranges: [RANGE],
      includeGridData: true,
    });

    const gridData = response.data.sheets[0].data[0];

    const coloredCells: any = [];

    gridData.rowData.forEach((row: any, rowIndex: number) => {
      if (row.values) {
        row.values.forEach((cell: any, colIndex: number) => {
          if (cell.userEnteredFormat && cell.userEnteredFormat.backgroundColor) {
            const { red, green, blue } = cell.userEnteredFormat.backgroundColor;
            // 흰색 배경색 제외
            if (red === 1 && green === 1 && blue === 1) {
              return;
            } else {
              coloredCells.push({ row: rowIndex + 7, col: colIndex + 2 }); // B7 기준으로 조정
            }
          }
        });
      }
    });

    // 이미 입력된 이름 확인
    const valuesResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: RANGE,
    });

    const existingValues = valuesResponse.data.values || [];
    if (existingValues.flat().includes(userName)) {
      throw new Error("이미 배정이 완료되었습니다.");
    }

    // 빈 셀 찾기
    const emptyCells = coloredCells.filter((cell: any) => {
      const rowIndex = cell.row - 7;
      const colIndex = cell.col - 2;
      return !existingValues[rowIndex] || !existingValues[rowIndex][colIndex];
    });

    if (emptyCells.length === 0) {
      throw new Error("빈 자리가 없습니다.");
    }

    // 무작위로 빈 셀 선택
    const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];

    // A1 표기법으로 범위 설정
    const range = `${SHEET_NAME}!A${randomCell.row}:${randomCell.col}${randomCell.row}`;

    const responseGroupNumber = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range,
    });
    const data = responseGroupNumber.data.values[0];
    const groupNumber = data[0];

    // 선택된 셀에 사용자 이름 입력
    sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `점심조!${String.fromCharCode(65 + randomCell.col - 1)}${randomCell.row}`,
      valueInputOption: "RAW",
      resource: {
        values: [[userName]],
      },
    });

    return NextResponse.json(
      {
        message: "점심조가 배정되었습니다.",
        cell: randomCell,
        groupNumber: Number(groupNumber),
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
