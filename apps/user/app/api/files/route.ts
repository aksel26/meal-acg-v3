import { NextRequest, NextResponse } from "next/server";
import { findSemesterFolder, findExcelFiles } from "@/lib/firebase-storage";
import { getSemesterInfo } from "@/lib/date-utils";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name");
    const year = parseInt(searchParams.get("year") || "");
    const month = parseInt(searchParams.get("month") || "");

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

    const currentYear = year || new Date().getFullYear();

    // 상반기/하반기 정보 확인
    const semesterInfo = getSemesterInfo(month, currentYear);

    // Firebase Storage에서 해당 학기 폴더 찾기
    const folderPath = await findSemesterFolder(month, currentYear);
    if (!folderPath) {
      return NextResponse.json(
        {
          error: "Semester folder not found",
          details: `${semesterInfo.folderName} 폴더를 찾을 수 없습니다.`,
        },
        { status: 404 }
      );
    }

    // 사용자명과 매칭되는 Excel 파일 찾기
    const files = await findExcelFiles(folderPath, name);
    if (files.length === 0) {
      return NextResponse.json(
        {
          error: "Excel file not found",
          details: `${name}.xlsx 또는 ${name}.xls 파일을 찾을 수 없습니다.`,
          searchedFolder: folderPath,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        semesterInfo,
        folderPath,
        files,
        totalFiles: files.length,
      },
    });
  } catch (error) {
    console.error("Files API error:", error);
    return NextResponse.json(
      {
        error: "Failed to search files",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
