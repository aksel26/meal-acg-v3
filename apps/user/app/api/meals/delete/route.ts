import { getSemesterInfo } from "@/lib/date-utils";
import {
  downloadFileBuffer,
  findExcelFiles,
  findSemesterFolder,
  uploadFileBuffer,
} from "@/lib/firebase-storage";
import { NextRequest, NextResponse } from "next/server";
import * as ExcelJS from "exceljs";

interface DeleteMealRequest {
  userName: string;
  date: string;
}

export async function DELETE(request: NextRequest) {
  try {
    const body: DeleteMealRequest = await request.json();
    const { userName, date } = body;
    console.log("date: ", date);

    if (!userName || !date) {
      return NextResponse.json(
        {
          success: false,
          error: "필수 파라미터가 누락되었습니다.",
          details: "userName과 date가 필요합니다.",
        },
        { status: 400 }
      );
    }

    const targetDate = new Date(date);
    const month = targetDate.getMonth() + 1;
    const year = targetDate.getFullYear();
    const day = targetDate.getDate();

    console.log(
      `Processing meal deletion for ${userName} on ${targetDate.toISOString().split("T")[0]}`
    );

    // 1. 학기 폴더 찾기
    const semesterFolder = await findSemesterFolder(month, year);
    if (!semesterFolder) {
      return NextResponse.json(
        {
          success: false,
          error: "해당 월의 학기 폴더를 찾을 수 없습니다.",
          details: `${month}월 ${year}년에 대한 폴더가 존재하지 않습니다.`,
        },
        { status: 404 }
      );
    }

    // 2. 사용자별 엑셀 파일 찾기
    const excelFiles = await findExcelFiles(semesterFolder, userName);

    if (!excelFiles || excelFiles.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "사용자의 엑셀 파일을 찾을 수 없습니다.",
          details: `${userName}에 해당하는 파일이 ${semesterFolder}에 없습니다.`,
        },
        { status: 404 }
      );
    }

    const results = [];

    // 3. 각 파일에서 해당 날짜의 모든 데이터를 빈 값으로 설정
    for (const file of excelFiles) {
      try {
        console.log(`Processing file: ${file.name}`);

        // 파일 다운로드
        const buffer = await downloadFileBuffer(file.fullPath);
        const workbook = new ExcelJS.Workbook();
        // @ts-ignore: Buffer type incompatibility with Firebase storage buffer
        await workbook.xlsx.load(buffer as any);

        // 두 번째 시트 '내역' 가져오기
        const worksheet = workbook.worksheets[1]; // 두 번째 시트
        const sheetName = worksheet?.name;

        if (!worksheet) {
          console.log(`No worksheet found in ${file.name}`);
          continue;
        }

        // 날짜 찾기 - B열(연도), C열(월), D열(일)에서 찾기
        let targetRow = -1;

        // 효율적인 날짜 탐색: 우선순위별 탐색 (월 → 일 → 연도)
        console.log(
          `Searching for date: ${year}/${month}/${day} in ${file.name} sheet: ${sheetName}`
        );

        // B3부터 D200까지 범위에서 탐색
        const startRow = 3;
        const endRow = 200;
        console.log(`Searching in range B${startRow}:D${endRow}`);

        // 1단계: 해당 월이 있는 행들을 먼저 찾기
        const monthMatchRows = [];
        for (let row = startRow; row <= endRow; row++) {
          const monthCell = worksheet.getCell(`C${row}`);
          if (
            monthCell &&
            monthCell.value !== null &&
            monthCell.value !== undefined
          ) {
            const rawValue = monthCell.value;
            let monthValue: number;
            if (typeof rawValue === "string") {
              monthValue = parseInt(rawValue);
            } else if (typeof rawValue === "number") {
              monthValue = rawValue;
            } else {
              continue;
            }

            if (!isNaN(monthValue) && monthValue === month) {
              monthMatchRows.push(row);
            }
          }
        }

        console.log(`Found ${monthMatchRows.length} rows with month ${month}`);

        // 2단계: 월이 일치하는 행들 중에서 일이 일치하는 행 찾기
        const dayMatchRows = [];
        for (const row of monthMatchRows) {
          const dayCell = worksheet.getCell(`D${row}`);
          if (
            dayCell &&
            dayCell.value !== null &&
            dayCell.value !== undefined
          ) {
            const rawValue = dayCell.value;
            let dayValue: number;
            if (typeof rawValue === "string") {
              dayValue = parseInt(rawValue);
            } else if (typeof rawValue === "number") {
              dayValue = rawValue;
            } else {
              continue;
            }

            if (!isNaN(dayValue) && dayValue === day) {
              dayMatchRows.push(row);
            }
          }
        }

        console.log(
          `Found ${dayMatchRows.length} rows with month ${month} and day ${day}`
        );

        // 3단계: 월과 일이 일치하는 행들 중에서 연도가 일치하는 행 찾기
        for (const row of dayMatchRows) {
          const yearCell = worksheet.getCell(`B${row}`);
          if (
            yearCell &&
            yearCell.value !== null &&
            yearCell.value !== undefined
          ) {
            const rawValue = yearCell.value;
            let yearValue: number;
            if (typeof rawValue === "string") {
              yearValue = parseInt(rawValue);
            } else if (typeof rawValue === "number") {
              yearValue = rawValue;
            } else {
              continue;
            }

            if (!isNaN(yearValue) && yearValue === year) {
              targetRow = row;
              console.log(
                `Found exact match at row ${row}: ${year}/${month}/${day}`
              );
              break;
            }
          }
        }

        if (targetRow === -1) {
          console.log(`Date ${day}/${month}/${year} not found in ${file.name}`);
          continue;
        }

        console.log(`Found target date at row ${targetRow} in ${file.name}`);

        // 해당 행의 모든 식사 관련 데이터를 빈 값으로 설정
        const columnsToDelete = [
          // 조식 관련 (P, Q, R 열)
          "P",
          "Q",
          "R",
          // 중식 관련 (I, J, L 열)
          "I",
          "J",
          "L",
          // 석식 관련 (M, N, O 열)
          "M",
          "N",
          "O",
          // 근태 (H 열)
          "H",
        ];

        columnsToDelete.forEach((col) => {
          const cellAddress = `${col}${targetRow}`;
          // 셀이 존재하는 경우에만 값만 삭제하고 스타일은 유지
          const cell = worksheet.getCell(cellAddress);
          cell.value = "";
        });

        // 파일 저장
        const newBuffer = await workbook.xlsx.writeBuffer();
        await uploadFileBuffer(file.fullPath, Buffer.from(newBuffer));

        results.push({
          fileName: file.name,
          date: targetDate.toISOString().split("T")[0],
          deletedData: {
            row: targetRow,
            deletedColumns: columnsToDelete,
          },
        });

        console.log(
          `Successfully deleted meal data from ${file.name} at row ${targetRow}`
        );
      } catch (fileError) {
        console.error(`Error processing file ${file.name}:`, fileError);
        results.push({
          fileName: file.name,
          error:
            fileError instanceof Error
              ? fileError.message
              : "파일 처리 중 오류 발생",
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "식사 기록이 성공적으로 삭제되었습니다.",
      data: {
        userName,
        date: targetDate.toISOString().split("T")[0],
        semesterInfo: getSemesterInfo(month, year),
        results,
      },
    });
  } catch (error) {
    console.error("Error in meal delete API:", error);
    return NextResponse.json(
      {
        success: false,
        error: "서버 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : "알 수 없는 오류",
      },
      { status: 500 }
    );
  }
}
