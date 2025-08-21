import { sheets } from "@/lib/google-config";
import { NextResponse } from "next/server";

// Constants
const SHEET_NAME = "점심조";
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const WHITE_COLOR = { red: 1, green: 1, blue: 1 };
const BASE_ROW_OFFSET = 7;
const BASE_COL_OFFSET = 2;

// Types
interface CellPosition {
  row: number;
  col: number;
}

interface GridDimensions {
  totalMembers: number;
  membersPerGroup: number;
  maxRows: number;
  maxCols: number;
}

interface CellData {
  userEnteredFormat?: {
    backgroundColor?: {
      red: number;
      green: number;
      blue: number;
    };
  };
}

interface RowData {
  values?: CellData[];
}

interface GridData {
  rowData?: RowData[];
}

// Utility functions
const calculateGridDimensions = (totalMembers: number, membersPerGroup: number): GridDimensions => {
  const remainder = totalMembers % membersPerGroup;
  const maxCols = remainder > 0 && remainder < membersPerGroup ? membersPerGroup + 1 : membersPerGroup;
  const maxRows = remainder > 0 ? Math.floor(totalMembers / membersPerGroup) : totalMembers / membersPerGroup;
  
  return { totalMembers, membersPerGroup, maxRows, maxCols };
};

const buildRange = (maxCols: number, maxRows: number): string => {
  // B7부터 시작하여 색칠된 셀 영역을 탐색
  const endCol = String.fromCharCode(65 + BASE_COL_OFFSET - 1 + maxCols);
  const endRow = BASE_ROW_OFFSET - 1 + maxRows;
  return `${SHEET_NAME}!B${BASE_ROW_OFFSET}:${endCol}${endRow}`;
};

const isWhiteBackground = (backgroundColor?: { red: number; green: number; blue: number }): boolean => {
  if (!backgroundColor) return true;
  const { red, green, blue } = backgroundColor;
  return red === WHITE_COLOR.red && green === WHITE_COLOR.green && blue === WHITE_COLOR.blue;
};

const extractColoredCells = (gridData: GridData): CellPosition[] => {
  const coloredCells: CellPosition[] = [];
  
  gridData.rowData?.forEach((row, rowIndex) => {
    row.values?.forEach((cell, colIndex) => {
      const backgroundColor = cell.userEnteredFormat?.backgroundColor;
      if (backgroundColor && !isWhiteBackground(backgroundColor)) {
        const cellPosition = { 
          row: rowIndex + BASE_ROW_OFFSET, 
          col: colIndex + BASE_COL_OFFSET 
        };
        coloredCells.push(cellPosition);
        
        // 디버깅: B7부터 탐색되는지 확인
        const cellNotation = convertToA1Notation(cellPosition.col, cellPosition.row);
        console.log(`색칠된 셀 발견: ${cellNotation} (row: ${cellPosition.row}, col: ${cellPosition.col})`);
      }
    });
  });
  
  console.log(`총 ${coloredCells.length}개의 색칠된 셀을 B7부터 탐색하여 발견했습니다.`);
  return coloredCells;
};

const findEmptyCells = (coloredCells: CellPosition[], existingValues: string[][]): CellPosition[] => {
  return coloredCells.filter((cell) => {
    const rowIndex = cell.row - BASE_ROW_OFFSET;
    const colIndex = cell.col - BASE_COL_OFFSET;
    return !existingValues[rowIndex] || !existingValues[rowIndex][colIndex];
  });
};

const selectRandomCell = (emptyCells: CellPosition[]): CellPosition => {
  if (emptyCells.length === 0) {
    throw new Error("선택할 수 있는 빈 셀이 없습니다.");
  }
  return emptyCells[Math.floor(Math.random() * emptyCells.length)]!;
};

const convertToA1Notation = (col: number, row: number): string => {
  return `${String.fromCharCode(65 + col - 1)}${row}`;
};

// Validation functions
const validateUserName = (userName: string): void => {
  if (!userName || typeof userName !== 'string' || userName.trim().length === 0) {
    throw new Error("유효하지 않은 사용자 이름입니다.");
  }
};

const validateEnvironment = (): void => {
  if (!SPREADSHEET_ID) {
    throw new Error("GOOGLE_SHEET_ID 환경 변수가 설정되지 않았습니다.");
  }
};

export async function POST(request: Request) {
  try {
    validateEnvironment();
    
    let requestBody;
    try {
      requestBody = await request.json();
    } catch {
      throw new Error("잘못된 JSON 형식입니다.");
    }
    
    const { userName } = requestBody;
    validateUserName(userName);

    // 1. 스프레드시트 메타데이터 가져오기
    const metadataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A4:B4`,
    });

    const metadataValues = metadataResponse.data.values;
    if (!metadataValues || !metadataValues[0] || metadataValues[0].length < 2) {
      throw new Error("메타데이터를 가져올 수 없습니다.");
    }
    
    const [totalMembers, membersPerGroup] = metadataValues[0].map(Number);
    if (totalMembers <= 0 || membersPerGroup <= 0 || isNaN(totalMembers) || isNaN(membersPerGroup)) {
      throw new Error("잘못된 그리드 설정값입니다.");
    }

    const dimensions = calculateGridDimensions(totalMembers, membersPerGroup);
    const range = buildRange(dimensions.maxCols, dimensions.maxRows);
    
    console.log(`B7부터 탐색 범위: ${range} (총 멤버: ${totalMembers}, 조당 인원: ${membersPerGroup})`);

    // 2. 실제 범위로 다시 데이터 가져오기
    const [gridResponse, valuesResponse] = await Promise.all([
      sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID,
        ranges: [range],
        includeGridData: true,
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: range,
      })
    ]);

    const gridData = gridResponse.data.sheets?.[0]?.data?.[0];
    if (!gridData) {
      throw new Error("시트 데이터를 가져올 수 없습니다.");
    }

    const existingValues = valuesResponse.data.values || [];
    
    // 3. 사용자가 이미 배정되었는지 확인
    if (existingValues.flat().includes(userName)) {
      throw new Error("이미 배정이 완료되었습니다.");
    }

    // 4. 색칠된 셀과 빈 셀 찾기
    const coloredCells = extractColoredCells(gridData);
    const emptyCells = findEmptyCells(coloredCells, existingValues);

    if (emptyCells.length === 0) {
      throw new Error("빈 자리가 없습니다.");
    }

    // 5. 랜덤 셀 선택 및 그룹 번호 가져오기
    const randomCell = selectRandomCell(emptyCells);
    const groupRange = `${SHEET_NAME}!A${randomCell.row}`;
    
    const [groupResponse] = await Promise.all([
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: groupRange,
      }),
      // 6. 사용자 이름 입력
      sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!${convertToA1Notation(randomCell.col, randomCell.row)}`,
        valueInputOption: "RAW",
        resource: {
          values: [[userName]],
        },
      })
    ]);

    const groupNumber = groupResponse.data.values?.[0]?.[0];
    if (!groupNumber) {
      throw new Error("그룹 번호를 가져올 수 없습니다.");
    }

    return NextResponse.json(
      {
        success: true,
        message: "점심조가 배정되었습니다.",
        data: {
          cell: randomCell,
          groupNumber: Number(groupNumber) || 0,
          userName,
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Lunch group assignment error:", error);
    const errorMessage = error instanceof Error ? error.message : "점심조 배정 중 오류가 발생했습니다.";

    return NextResponse.json({ 
      success: false,
      error: errorMessage 
    }, { status: 500 });
  }
}
