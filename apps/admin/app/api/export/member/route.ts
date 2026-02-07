import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import ExcelJS from "exceljs";

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

// 날짜를 YYYY-MM-DD 형식으로 정규화
function normalizeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// GET /api/export/member - 멤버별 엑셀 내보내기 (hmkim.xlsx 형식)
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const searchParams = request.nextUrl.searchParams;

    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
    const half = searchParams.get("half") || "H1"; // H1: 상반기, H2: 하반기
    const memberId = searchParams.get("memberId");

    // 반기에 따른 월 범위 설정
    const startMonth = half === "H1" ? 1 : 7;
    const endMonth = half === "H1" ? 6 : 12;
    const halfLabel = half === "H1" ? "상반기" : "하반기";

    // 시작일과 종료일 계산
    const startDate = `${year}-${String(startMonth).padStart(2, "0")}-01`;
    const lastDayOfEndMonth = new Date(year, endMonth, 0).getDate();
    const endDate = `${year}-${String(endMonth).padStart(2, "0")}-${String(lastDayOfEndMonth).padStart(2, "0")}`;

    if (!memberId) {
      return NextResponse.json({ error: "memberId is required" }, { status: 400 });
    }

    // 멤버 정보, 공휴일, meal_logs를 병렬로 조회
    const [memberResult, holidaysResult, mealLogsResult] = await Promise.all([
      supabase.from("members").select("id, full_name").eq("id", memberId).single(),
      supabase.from("holidays").select("holiday_date, description").gte("holiday_date", startDate).lte("holiday_date", endDate),
      supabase.from("meal_logs").select("*").eq("user_id", memberId).gte("entry_date", startDate).lte("entry_date", endDate),
    ]);

    const { data: member, error: memberError } = memberResult;
    const { data: holidays } = holidaysResult;
    const { data: mealLogs } = mealLogsResult;

    if (memberError || !member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const holidayMap = new Map<string, string>();
    holidays?.forEach((h) => {
      holidayMap.set(h.holiday_date, h.description || "");
    });

    // 반기의 모든 날짜 생성 (내역용)
    const allDates: { date: Date; dateStr: string; month: number }[] = [];
    for (let m = startMonth; m <= endMonth; m++) {
      const daysInMonth = new Date(year, m, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, m - 1, day);
        const dateStr = `${year}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        allDates.push({ date, dateStr, month: m });
      }
    }

    // meal_logs를 날짜별로 맵핑
    const logMap = new Map<string, NonNullable<typeof mealLogs>[number]>();
    mealLogs?.forEach((log) => {
      logMap.set(normalizeDate(log.entry_date), log);
    });

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "ACG 식대 Admin";
    workbook.created = new Date();

    // 통계 시트
    const statsSheet = workbook.addWorksheet("통계");

    // Row 1: 안내문
    statsSheet.getCell("A1").value = "본 Sheet는 수정 할 수 없으며 통계에 이상이 있을 경우 People팀 홍세영 선임에게 문의 요망";
    statsSheet.getRow(1).font = { color: { argb: "FFFF0000" } };

    // Row 2: 메인 헤더
    statsSheet.getCell("B2").value = "연도";
    statsSheet.getCell("C2").value = "월";
    statsSheet.getCell("D2").value = "업무일";
    statsSheet.getCell("E2").value = "휴일";
    statsSheet.getCell("F2").value = "업무일 기준\n사용 가능액";
    statsSheet.getCell("G2").value = "근태";
    statsSheet.getCell("I2").value = "실 사용 가능액\n(근태 반영)";
    statsSheet.getCell("J2").value = "현 잔액";
    statsSheet.getCell("K2").value = "사용액";

    // Row 3: 서브 헤더
    statsSheet.getCell("G3").value = "연차/휴무";
    statsSheet.getCell("H3").value = "휴일 근무";
    statsSheet.getCell("K3").value = "중식";
    statsSheet.getCell("L3").value = "석식";
    statsSheet.getCell("M3").value = "조식";
    statsSheet.getCell("N3").value = "*) 조식과 석식은 월 단위 중식 비용에 포함하여 사용할 수 없으며 일 기준 비용을 준수하여야 함(조식 9,000원, 석식 11,000원)";

    // 셀 병합
    statsSheet.mergeCells("G2:H2"); // 근태
    statsSheet.mergeCells("K2:M2"); // 사용액
    statsSheet.mergeCells("B2:B3"); // 연도
    statsSheet.mergeCells("C2:C3"); // 월
    statsSheet.mergeCells("D2:D3"); // 업무일
    statsSheet.mergeCells("E2:E3"); // 휴일
    statsSheet.mergeCells("F2:F3"); // 사용 가능액
    statsSheet.mergeCells("I2:I3"); // 실 사용 가능액
    statsSheet.mergeCells("J2:J3"); // 현 잔액

    // 헤더 스타일
    statsSheet.getRow(2).font = { bold: true };
    statsSheet.getRow(3).font = { bold: true };
    statsSheet.getRow(2).alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    statsSheet.getRow(3).alignment = { vertical: "middle", horizontal: "center" };

    // B2~M3 배경색 #D9D9D9 및 테두리
    const statsBorder: ExcelJS.Border = { style: "thin", color: { argb: "FF808080" } };
    for (let row = 2; row <= 3; row++) {
      for (let col = 2; col <= 13; col++) { // B=2, M=13
        const cell = statsSheet.getRow(row).getCell(col);
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFD9D9D9" },
        };
        cell.border = {
          top: statsBorder,
          left: statsBorder,
          bottom: statsBorder,
          right: statsBorder,
        };
      }
    }

    // N3 빨간색 텍스트
    statsSheet.getCell("N3").font = { bold: true, color: { argb: "FFFF0000" } };

    // Row 4~: 월별 데이터 (해당 반기 6개월)
    for (let m = startMonth; m <= endMonth; m++) {
      const rowNum = 3 + (m - startMonth + 1);
      const row = statsSheet.getRow(rowNum);

      // B: 연도, C: 월
      row.getCell(2).value = year;
      row.getCell(3).value = m;

      // D: 업무일 - 수식 (내역 E열=업무일구분, B열=월)
      row.getCell(4).value = {
        formula: `COUNTIFS(내역!$E:$E,"업무일",내역!$B:$B,통계!$C${rowNum})`,
      };

      // E: 휴일 - 수식
      row.getCell(5).value = {
        formula: `COUNTIFS(내역!$E:$E,"휴일",내역!$B:$B,통계!$C${rowNum})`,
      };

      // F: 업무일 기준 사용 가능액 - 수식
      row.getCell(6).value = { formula: `D${rowNum}*10000` };
      row.getCell(6).numFmt = "#,##0";

      // G: 근태 - 연차/휴무 - 수식 (내역 G열=근태, B열=월)
      row.getCell(7).value = {
        formula: `COUNTIFS(내역!$G:$G,"연차/휴무",내역!$B:$B,통계!$C${rowNum})+COUNTIFS(내역!$G:$G,"오전 반차/휴무",내역!$B:$B,통계!$C${rowNum})+COUNTIFS(내역!$G:$G,"오후 반차/휴무",내역!$B:$B,통계!$C${rowNum})`,
      };

      // H: 휴일근무 - 수식
      row.getCell(8).value = {
        formula: `COUNTIFS(내역!$G:$G,"근무",내역!$E:$E,"휴일",내역!$B:$B,통계!$C${rowNum})`,
      };

      // I: 실 사용 가능액 (근태 반영) - 수식
      row.getCell(9).value = {
        formula: `F${rowNum}-(10000*(COUNTIFS(내역!$G:$G,"연차/휴무",내역!$B:$B,통계!$C${rowNum})+COUNTIFS(내역!$G:$G,"오전 반차/휴무",내역!$B:$B,통계!$C${rowNum})+COUNTIFS(내역!$G:$G,"오후 반차/휴무",내역!$B:$B,통계!$C${rowNum})+COUNTIFS(내역!$G:$G,"재택근무",내역!$B:$B,통계!$C${rowNum})+COUNTIFS(내역!$G:$G,"근무(개별식사 / 식사안함)",내역!$B:$B,통계!$C${rowNum})))+(10000*H${rowNum})`,
      };
      row.getCell(9).numFmt = "#,##0";

      // J: 현 잔액 - 수식
      row.getCell(10).value = {
        formula: `IF(K${rowNum}>0,I${rowNum}-K${rowNum},"")`,
      };
      row.getCell(10).numFmt = "#,##0";

      // K: 중식 사용액 - 수식 (내역 I열=중식금액, G열=근태, B열=월)
      row.getCell(11).value = {
        formula: `SUMIFS(내역!$I$4:$I$1048576,내역!$G$4:$G$1048576,"근무",내역!$B$4:$B$1048576,통계!$C${rowNum})`,
      };
      row.getCell(11).numFmt = "#,##0";

      // L: 석식 사용액 - 수식 (내역 M열=석식금액)
      row.getCell(12).value = {
        formula: `SUMIFS(내역!$M$4:$M$1048576,내역!$G$4:$G$1048576,"근무",내역!$B$4:$B$1048576,통계!$C${rowNum})`,
      };
      row.getCell(12).numFmt = "#,##0";

      // M: 조식 사용액 - 수식 (내역 P열=조식금액)
      row.getCell(13).value = {
        formula: `SUMIFS(내역!$P$4:$P$1048576,내역!$G$4:$G$1048576,"근무",내역!$B$4:$B$1048576,통계!$C${rowNum})`,
      };
      row.getCell(13).numFmt = "#,##0";

      // B~M열 테두리 (2~13번 열)
      for (let col = 2; col <= 13; col++) {
        row.getCell(col).border = {
          top: statsBorder,
          left: statsBorder,
          bottom: statsBorder,
          right: statsBorder,
        };
      }
    }

    // 안내 문구 (6개월 데이터 후 한 줄 띄우고 - Row 11)
    const infoRowNum = 11;
    statsSheet.getCell(`J${infoRowNum}`).value = "1일부터 말일까지 사용한 비용의 초과분은 아래의 계좌로 입금\n입금 계좌 : 국민은행 005701-04-142344 (㈜에이시지알)";
    statsSheet.mergeCells(`J${infoRowNum}:M${infoRowNum}`);
    statsSheet.getRow(infoRowNum).alignment = { wrapText: true };

    // 열 너비
    statsSheet.columns = [
      { width: 5 },   // A
      { width: 8 },   // B: 연도
      { width: 5 },   // C: 월
      { width: 8 },   // D: 업무일
      { width: 6 },   // E: 휴일
      { width: 15 },  // F: 사용 가능액
      { width: 10 },  // G: 연차/휴무
      { width: 10 },  // H: 휴일 근무
      { width: 15 },  // I: 실 사용 가능액
      { width: 12 },  // J: 현 잔액
      { width: 10 },  // K: 중식
      { width: 10 },  // L: 석식
      { width: 10 },  // M: 조식
      { width: 50 },  // N: 안내
    ];

    // 내역 시트 (컬럼 구조: A=연도, B=월, C=일, D=요일, E=업무일구분, F=특이사항, G=근태, H=중식상호, I=중식금액, J=알림용, K=중식비고, L=석식상호, M=석식금액, N=석식비고, O=조식상호, P=조식금액, Q=조식비고)
    const detailSheet = workbook.addWorksheet("내역");

    // 헤더 Row 1
    detailSheet.getRow(1).values = [
      null, null, null, null, null, null, "직접 입력",
      null, null, null, null, null, null, null, null, null, null
    ];

    // 헤더 Row 2
    detailSheet.getRow(2).values = [
      "일자", null, null, null, null, null, "근태",
      "중식 내역", null, null, null,
      "석식 내역", null, null,
      "조식 내역", null, null
    ];

    // 헤더 Row 3
    detailSheet.getRow(3).values = [
      "연도", "월", "일", "요일", "업무일 구분", "특이 사항", null,
      "상호명", "금액", "알림용(작성 금지)", "비고",
      "상호명", "금액", "비고",
      "상호명", "금액", "비고"
    ];

    // 셀 병합
    detailSheet.mergeCells("A2:F2"); // 일자
    detailSheet.mergeCells("G1:Q1"); // 직접 입력
    detailSheet.mergeCells("G2:G3"); // 근태
    detailSheet.mergeCells("H2:K2"); // 중식 내역
    detailSheet.mergeCells("L2:N2"); // 석식 내역
    detailSheet.mergeCells("O2:Q2"); // 조식 내역

    // 스타일 적용
    const detailBorder: ExcelJS.Border = { style: "thin", color: { argb: "FF808080" } };

    // G1~Q1: 파란색 배경, 글씨 굵기 보통
    for (let col = 7; col <= 17; col++) { // G=7, Q=17
      const cell = detailSheet.getRow(1).getCell(col);
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFDDEBF7" },
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    }

    // A2~Q3: 회색 배경, 테두리
    for (let row = 2; row <= 3; row++) {
      for (let col = 1; col <= 17; col++) { // A=1, Q=17
        const cell = detailSheet.getRow(row).getCell(col);
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE0E0E0" },
        };
        cell.border = {
          top: detailBorder,
          left: detailBorder,
          bottom: detailBorder,
          right: detailBorder,
        };
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.font = { bold: true };
      }
    }

    // 열 너비 설정
    detailSheet.columns = [
      { width: 8 },  // A: 연도
      { width: 5 },  // B: 월
      { width: 5 },  // C: 일
      { width: 5 },  // D: 요일
      { width: 12 }, // E: 업무일 구분
      { width: 12 }, // F: 특이 사항
      { width: 20 }, // G: 근태
      { width: 15 }, // H: 중식 상호명
      { width: 10 }, // I: 중식 금액
      { width: 15 }, // J: 알림용
      { width: 12 }, // K: 중식 비고
      { width: 15 }, // L: 석식 상호명
      { width: 10 }, // M: 석식 금액
      { width: 12 }, // N: 석식 비고
      { width: 15 }, // O: 조식 상호명
      { width: 10 }, // P: 조식 금액
      { width: 12 }, // Q: 조식 비고
    ];

    // 데이터 Row 4부터 (A~Q에 데이터)
    allDates.forEach(({ date, dateStr, month }, index) => {
      const rowNum = index + 4;
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = holidayMap.has(dateStr);
      const holidayDesc = holidayMap.get(dateStr) || "";

      const workType = isWeekend || isHoliday ? "휴일" : "업무일";
      const specialNote = isHoliday ? holidayDesc : null;

      const log = logMap.get(dateStr);
      const isExcludedAttendance = log?.attendance?.includes("개별") || log?.attendance?.includes("재택") || log?.attendance?.includes("연차") || log?.attendance?.includes("휴무") || log?.attendance?.includes("반차");

      const row = detailSheet.getRow(rowNum);
      row.values = [
        year, // A: 연도
        month, // B: 월
        date.getDate(), // C: 일
        DAY_NAMES[dayOfWeek], // D: 요일
        workType, // E: 업무일 구분
        specialNote, // F: 특이 사항
        log?.attendance || null, // G: 근태
        isExcludedAttendance ? null : (log?.lunch_store || null), // H: 중식 상호명
        isExcludedAttendance ? null : (log?.lunch_amount || null), // I: 중식 금액
        null, // J: 알림용
        isExcludedAttendance ? null : (log?.lunch_payer || null), // K: 중식 비고
        isExcludedAttendance ? null : (log?.dinner_store || null), // L: 석식 상호명
        isExcludedAttendance ? null : (log?.dinner_amount || null), // M: 석식 금액
        isExcludedAttendance ? null : (log?.dinner_payer || null), // N: 석식 비고
        isExcludedAttendance ? null : (log?.breakfast_store || null), // O: 조식 상호명
        isExcludedAttendance ? null : (log?.breakfast_amount || null), // P: 조식 금액
        isExcludedAttendance ? null : (log?.breakfast_payer || null), // Q: 조식 비고
      ];

      // 금액 포맷 (I=9, M=13, P=16)
      if (log?.lunch_amount) {
        row.getCell(9).numFmt = "#,##0";
      }
      if (log?.dinner_amount) {
        row.getCell(13).numFmt = "#,##0";
      }
      if (log?.breakfast_amount) {
        row.getCell(16).numFmt = "#,##0";
      }

      // 기본 스타일: G~Q열 배경색 #DDEBF7 (J열 제외)
      const blueColumns = [7, 8, 9, 11, 12, 13, 14, 15, 16, 17]; // G,H,I,K,L,M,N,O,P,Q
      blueColumns.forEach((col) => {
        row.getCell(col).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFDDEBF7" },
        };
      });

      // A~G열 가운데 정렬 (1~7번 열)
      for (let col = 1; col <= 7; col++) {
        row.getCell(col).alignment = { horizontal: "center" };
      }

      // 휴일 스타일 (E열, F열만)
      if (isWeekend || isHoliday) {
        // E열(5): 배경색 + 빨간 텍스트
        row.getCell(5).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF6C9CE" },
        };
        row.getCell(5).font = { color: { argb: "FFFF0000" } };

        // F열(6): 빨간 텍스트만
        row.getCell(6).font = { color: { argb: "FFFF0000" } };
      }

      // A~Q열 테두리 (1~17번 열)
      const border: ExcelJS.Border = { style: "thin", color: { argb: "FF808080" } };
      for (let col = 1; col <= 17; col++) {
        row.getCell(col).border = {
          top: border,
          left: border,
          bottom: border,
          right: border,
        };
      }
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Return file
    const fileName = encodeURIComponent(`${member.full_name}.xlsx`);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${fileName}`,
      },
    });
  } catch (error) {
    console.error("Member export API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
