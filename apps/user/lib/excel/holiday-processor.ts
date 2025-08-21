import * as ExcelJS from "exceljs";
import { HolidayData, ExcelHolidayInfo } from "../types/excel-types";
import { getWorksheet, extractDataFromWorksheet } from "./excel-core";

// 엑셀에서 현재 월의 공휴일 정보 추출 (F열='휴일', G열에 값이 있는 경우)
export async function getHolidaysFromExcel(
  buffer: Buffer,
  targetMonth: number,
  targetYear?: number
): Promise<ExcelHolidayInfo[]> {
  const { worksheet } = await getWorksheet(buffer);
  const jsonData = extractDataFromWorksheet(worksheet, "B3:R204");
  const holidays: ExcelHolidayInfo[] = [];
  const currentYear = targetYear || new Date().getFullYear();

  console.log(`=== Extracting holidays for ${currentYear}-${targetMonth} ===`);

  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i] as any[];
    if (!row || row.length === 0) continue;

    const year = parseInt(row[0]) || 0; // B열 (연도)
    const month = parseInt(row[1]) || 0; // C열 (월)
    const day = parseInt(row[2]) || 0; // D열 (일)
    const workType = row[4] || ""; // F열 (근무구분)
    const holidayName = row[5] || ""; // G열 (공휴일명)

    // 해당 년도와 월에 해당하고, F열이 '휴일'이며, G열에 값이 있는 경우
    if (
      year === currentYear &&
      month === targetMonth &&
      String(workType).includes("휴일") &&
      holidayName
    ) {
      const dateString = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      holidays.push({
        rowIndex: i + 3, // B3부터 시작하므로 +3
        date: dateString,
        name: String(holidayName),
      });

      console.log(`Found holiday: ${dateString} - ${holidayName} (row ${i + 3})`);
    }
  }

  console.log(`Total holidays found in Excel: ${holidays.length}`);
  return holidays;
}

// 구글 캘린더 공휴일과 엑셀 공휴일 비교 후 업데이트
export async function updateExcelHolidays(
  buffer: Buffer,
  googleHolidays: HolidayData[],
  targetMonth: number,
  targetYear?: number
): Promise<Buffer> {
  const { workbook, worksheet } = await getWorksheet(buffer);

  // 현재 엑셀의 공휴일 정보 가져오기
  const excelHolidays = await getHolidaysFromExcel(buffer, targetMonth, targetYear);
  
  console.log(`=== Holiday Comparison ===`);
  console.log(`Google Calendar holidays: ${googleHolidays.length}`);
  console.log(`Excel holidays: ${excelHolidays.length}`);

  // 공휴일 수가 일치하지 않으면 업데이트 진행
  if (googleHolidays.length !== excelHolidays.length) {
    console.log("Holiday counts don't match. Updating Excel...");

    const jsonData = extractDataFromWorksheet(worksheet, "B3:R204");
    const currentYear = targetYear || new Date().getFullYear();

    // 구글 캘린더의 각 공휴일에 대해 엑셀 업데이트
    for (const googleHoliday of googleHolidays) {
      const holidayDate = new Date(googleHoliday.date);
      const year = holidayDate.getFullYear();
      const month = holidayDate.getMonth() + 1;
      const day = holidayDate.getDate();

      // 해당 날짜가 이미 엑셀에 공휴일로 등록되어 있는지 확인
      const existingHoliday = excelHolidays.find(h => h.date === googleHoliday.date);
      
      if (!existingHoliday && year === currentYear && month === targetMonth) {
        // 해당 날짜의 행 찾기
        let rowIndex = -1;
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          const rowYear = parseInt(row[0]) || 0;
          const rowMonth = parseInt(row[1]) || 0;
          const rowDay = parseInt(row[2]) || 0;

          if (rowYear === year && rowMonth === month && rowDay === day) {
            rowIndex = i + 3; // B3부터 시작하므로 +3
            break;
          }
        }

        if (rowIndex !== -1) {
          console.log(`Updating row ${rowIndex} for ${googleHoliday.date} - ${googleHoliday.name}`);

          // F열에 '휴일' 설정 (빨간색 배경)
          const workTypeCell = worksheet.getCell(`F${rowIndex}`);
          workTypeCell.value = "휴일";
          workTypeCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFF0000" }, // 빨간색 배경
          };

          // G열에 공휴일 이름 설정 (빨간색 텍스트)
          const holidayNameCell = worksheet.getCell(`G${rowIndex}`);
          holidayNameCell.value = googleHoliday.name;
          holidayNameCell.font = {
            color: { argb: "FFFF0000" }, // 빨간색 텍스트
          };

          console.log(`Updated: F${rowIndex}='휴일', G${rowIndex}='${googleHoliday.name}'`);
        } else {
          console.log(`Row not found for date: ${googleHoliday.date}`);
        }
      }
    }
  } else {
    console.log("Holiday counts match. No update needed.");
  }

  // 업데이트된 워크북을 Buffer로 변환
  const updatedBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(updatedBuffer);
}

// 구글 캘린더 API에서 공휴일 데이터 가져오기
export async function fetchGoogleHolidays(month: number): Promise<HolidayData[]> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/holidays?month=${month}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch holidays: ${response.statusText}`);
    }

    const holidays = await response.json();
    return holidays as HolidayData[];
  } catch (error) {
    console.error("Error fetching Google holidays:", error);
    throw error;
  }
}