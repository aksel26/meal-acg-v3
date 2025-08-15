import { NextRequest, NextResponse } from "next/server";
import { findSemesterFolder, findExcelFiles, downloadFileBuffer, uploadFileBuffer } from "@/lib/firebase-storage";
import { updateExcelMealData, MealSubmitData } from "@/lib/excel-processor";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userName, date, breakfast, lunch, dinner } = body;

    // 필수 파라미터 검증
    if (!userName || !date) {
      return NextResponse.json(
        {
          error: "필수 파라미터가 누락되었습니다.",
          required: ["userName", "date"],
          received: { userName, date },
        },
        { status: 400 }
      );
    }

    // 날짜 파싱
    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
      return NextResponse.json({ error: "올바르지 않은 날짜 형식입니다." }, { status: 400 });
    }

    const targetMonth = targetDate.getMonth() + 1;
    const targetYear = targetDate.getFullYear();

    console.log(`=== Meal Submit API ===`);
    console.log(`User: ${userName}, Date: ${date}`);
    console.log(`Breakfast:`, breakfast);
    console.log(`Lunch:`, lunch);
    console.log(`Dinner:`, dinner);

    // 1. 해당 학기 폴더 찾기
    const folderPath = await findSemesterFolder(targetMonth, targetYear);
    if (!folderPath) {
      return NextResponse.json({ 
        error: "Semester folder not found", 
        details: `${targetYear}년 ${targetMonth <= 6 ? '상반기' : '하반기'} 폴더를 찾을 수 없습니다.` 
      }, { status: 404 });
    }

    // 2. 사용자의 Excel 파일 찾기
    const files = await findExcelFiles(folderPath, userName);
    if (files.length === 0) {
      return NextResponse.json({ 
        error: "Excel file not found", 
        details: `${userName}.xlsx 또는 ${userName}.xls 파일을 찾을 수 없습니다.` 
      }, { status: 404 });
    }

    const targetFile = files[0];
    if (!targetFile) {
      return NextResponse.json({ 
        error: "No file found", 
        details: "파일 목록이 비어있습니다." 
      }, { status: 404 });
    }
    
    console.log(`Found target file: ${targetFile.name}`);

    // 3. Excel 파일 다운로드
    const originalBuffer = await downloadFileBuffer(targetFile.fullPath);

    // 4. 식사 데이터 준비
    const mealData: MealSubmitData = {
      date: targetDate,
      breakfast: {
        store: breakfast?.store || "",
        amount: parseInt(breakfast?.amount) || 0,
        payer: breakfast?.payer || "",
      },
      lunch: {
        store: lunch?.store || "",
        amount: parseInt(lunch?.amount) || 0,
        payer: lunch?.payer || "",
        attendance: lunch?.attendance || "",
      },
      dinner: {
        store: dinner?.store || "",
        amount: parseInt(dinner?.amount) || 0,
        payer: dinner?.payer || "",
      },
    };

    // 5. Excel 파일 업데이트
    const updatedBuffer = await updateExcelMealData(originalBuffer, mealData);

    // 6. 업데이트된 파일을 Firebase Storage에 업로드
    await uploadFileBuffer(targetFile.fullPath, updatedBuffer);

    console.log(`✅ Successfully updated meal data for ${userName} on ${date}`);

    return NextResponse.json({
      success: true,
      message: "식사 기록이 성공적으로 저장되었습니다.",
      data: {
        fileName: targetFile.name,
        date: date,
        updatedData: mealData,
      },
    });

  } catch (error) {
    console.error("Meal submit API error:", error);
    
    // 구체적인 에러 메시지 반환
    if (error instanceof Error) {
      if (error.message.includes("날짜의 행을 찾을 수 없습니다")) {
        return NextResponse.json({ 
          error: "Date not found", 
          details: error.message 
        }, { status: 404 });
      }
      
      if (error.message.includes("파일을 찾을 수 없습니다")) {
        return NextResponse.json({ 
          error: "File not found", 
          details: error.message 
        }, { status: 404 });
      }
    }
    
    return NextResponse.json({ 
      error: "Failed to submit meal data", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}