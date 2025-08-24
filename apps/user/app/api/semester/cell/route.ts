import { NextResponse, NextRequest } from "next/server";
import {
  findSemesterFolder,
  findExcelFiles,
  downloadFileBuffer,
} from "@/lib/firebase-storage";
import { readCellFromBuffer } from "@/lib/excel-processor";

export async function POST(request: NextRequest) {
  try {
    const { fileName, cellAddress, sheetName, userName, month, year } =
      await request.json();

    if (!fileName && !userName) {
      return NextResponse.json(
        {
          error: "fileName 또는 userName이 필요합니다.",
          required: ["fileName or userName", "cellAddress"],
          example: {
            fileName: "사용자명.xlsx (optional if userName provided)",
            userName: "사용자명 (optional if fileName provided)",
            cellAddress: "A1",
            sheetName: "Sheet1 (optional)",
            month: "8 (optional, defaults to current month)",
            year: "2025 (optional, defaults to current year)",
          },
        },
        { status: 400 }
      );
    }

    if (!cellAddress) {
      return NextResponse.json(
        {
          error: "셀 주소가 필요합니다.",
          required: ["cellAddress"],
          example: { cellAddress: "A1" },
        },
        { status: 400 }
      );
    }

    const targetMonth = month || new Date().getMonth() + 1;
    const targetYear = year || new Date().getFullYear();

    // 1. 폴더 찾기 (Firebase Storage)
    const folderPath = await findSemesterFolder(targetMonth, targetYear);
    if (!folderPath) {
      return NextResponse.json(
        { error: "Semester folder not found" },
        { status: 404 }
      );
    }

    let targetFile = null;

    if (fileName) {
      // fileName이 제공된 경우 직접 파일 경로 사용
      const fileNameWithoutExt = fileName.replace(/\.(xlsx|xls)$/i, "");
      const files = await findExcelFiles(folderPath, fileNameWithoutExt);

      if (files.length === 0) {
        return NextResponse.json(
          {
            error: "Excel file not found",
            details: `${fileName} 파일을 찾을 수 없습니다.`,
          },
          { status: 404 }
        );
      }

      targetFile = files[0];
    } else if (userName) {
      // userName으로 파일 검색
      const files = await findExcelFiles(folderPath, userName);

      if (files.length === 0) {
        return NextResponse.json(
          {
            error: "Excel file not found",
            details: `${userName}.xlsx 또는 ${userName}.xls 파일을 찾을 수 없습니다.`,
          },
          { status: 404 }
        );
      }

      targetFile = files[0];
    }

    if (!targetFile) {
      return NextResponse.json(
        {
          error: "No file found",
          details: "fileName 또는 userName이 필요합니다.",
        },
        { status: 400 }
      );
    }

    // 2. 파일 다운로드 및 셀 값 읽기
    try {
      const buffer = await downloadFileBuffer(targetFile.fullPath);
      const cellData = await readCellFromBuffer(buffer, cellAddress, sheetName);

      return NextResponse.json({
        success: true,
        fileInfo: {
          name: targetFile.name,
          fullPath: targetFile.fullPath,
          size: targetFile.size,
          contentType: targetFile.contentType,
          updated: targetFile.updated,
        },
        cellData: {
          ...cellData,
          method: "firebase_excel",
        },
        timestamp: new Date().toISOString(),
      });
    } catch (fileError) {
      console.error(`Error processing file ${targetFile.name}:`, fileError);
      return NextResponse.json(
        {
          error: "파일 처리 중 오류가 발생했습니다.",
          details:
            fileError instanceof Error
              ? fileError.message
              : "Unknown file error",
        },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    console.error("Error reading cell value:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        error: "셀 값 읽기 중 오류가 발생했습니다.",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
