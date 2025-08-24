import { NextRequest, NextResponse } from "next/server";
import {
  findSemesterFolder,
  findExcelFiles,
  downloadFileBuffer,
} from "@/lib/firebase-storage";
import { processExcelBuffer, CalculationResult } from "@/lib/excel-processor";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get("month") || "1");
    const name = searchParams.get("name");

    if (!name) {
      return NextResponse.json(
        { error: "Name parameter is required" },
        { status: 400 }
      );
    }

    if (!month || month < 1 || month > 12) {
      return NextResponse.json(
        { error: "Valid month parameter (1-12) is required" },
        { status: 400 }
      );
    }

    // 1. 폴더 찾기 (Firebase Storage)
    const folderPath = await findSemesterFolder(month);
    if (!folderPath) {
      return NextResponse.json(
        { error: "Semester folder not found" },
        { status: 404 }
      );
    }

    // 2. Excel 파일 찾기
    const files = await findExcelFiles(folderPath, name);
    if (files.length === 0) {
      return NextResponse.json(
        { error: "Excel file not found" },
        { status: 404 }
      );
    }

    // 3. 계산 수행
    for (const file of files) {
      try {
        // Firebase Storage에서 파일 다운로드
        const buffer = await downloadFileBuffer(file.fullPath);

        // Excel 파일 처리 및 계산
        const result = (await processExcelBuffer(
          buffer,
          month,
          undefined,
          undefined,
          "calculation"
        )) as CalculationResult;

        return NextResponse.json({
          success: true,
          data: {
            fileName: file.name,
            month,
            ...result,
          },
        });
      } catch (fileError) {
        console.error(`Error processing file ${file.name}:`, fileError);
        continue; // 다음 파일 시도
      }
    }

    return NextResponse.json(
      { error: "Could not calculate from files" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Calculate API error:", error);
    return NextResponse.json(
      {
        error: "Failed to calculate",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
