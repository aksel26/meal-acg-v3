import { NextRequest, NextResponse } from "next/server";
import { findSemesterFolder, findExcelFiles, downloadFileBuffer } from "@/lib/firebase-storage";
import { processExcelBuffer, MealData } from "@/lib/excel-processor";

export async function GET(request: NextRequest) {
  try {
    // Firebase 초기화 상태 확인
    const { admin } = await import("@/firebase/adminConfig");
    if (admin.apps.length === 0) {
      console.error("Firebase Admin is not initialized");
      return NextResponse.json({ 
        error: "Service temporarily unavailable. Please check configuration." 
      }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date"); // YYYY-MM-DD format
    const month = searchParams.get("month"); // MM format for month view
    const name = searchParams.get("name");

    if (!name) {
      return NextResponse.json({ error: "Name parameter is required" }, { status: 400 });
    }

    if (!date && !month) {
      return NextResponse.json({ error: "Either date or month parameter is required" }, { status: 400 });
    }

    console.log(`=== Calendar Meals API ===`);
    console.log(`Name: ${name}, Date: ${date}, Month: ${month}`);

    let targetYear: number;
    let targetMonth: number;
    let targetDay: number | undefined;

    if (date) {
      const [year, monthStr, dayStr] = date.split("-");
      targetYear = parseInt(year || "");
      targetMonth = parseInt(monthStr || "");
      targetDay = parseInt(dayStr || "");
    } else if (month) {
      targetYear = new Date().getFullYear();
      targetMonth = parseInt(month);
    } else {
      return NextResponse.json({ error: "Invalid date parameters" }, { status: 400 });
    }

    console.log(`Target: Year=${targetYear}, Month=${targetMonth}, Day=${targetDay}`);

    // 1. 폴더 찾기 (Firebase Storage)
    const folderPath = await findSemesterFolder(targetMonth, targetYear);
    if (!folderPath) {
      return NextResponse.json({ error: "Semester folder not found" }, { status: 404 });
    }

    // 2. Excel 파일 찾기
    const files = await findExcelFiles(folderPath, name);
    if (files.length === 0) {
      return NextResponse.json({ error: "Excel file not found" }, { status: 404 });
    }

    console.log(`Found ${files.length} files for user ${name}`);

    // 3. 식사 데이터 가져오기
    for (const file of files) {
      try {
        console.log(`Processing file: ${file.name}`);
        
        // Firebase Storage에서 파일 다운로드
        const buffer = await downloadFileBuffer(file.fullPath);
        
        // Excel 파일 처리 및 식사 데이터 추출
        const mealData = await processExcelBuffer(buffer, targetMonth, targetYear, targetDay, "meals") as MealData[];
        
        console.log(`Found ${mealData.length} meal entries`);

        return NextResponse.json({
          success: true,
          data: mealData,
        });

      } catch (fileError) {
        console.error(`Error processing file ${file.name}:`, fileError);
        continue; // 다음 파일 시도
      }
    }

    // 파일은 찾았지만 데이터가 없는 경우
    return NextResponse.json({
      success: true,
      data: [],
    });

  } catch (error) {
    console.error("Calendar meals API error:", error);
    return NextResponse.json({ 
      error: "Failed to fetch meal data", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}
