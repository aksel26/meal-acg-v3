import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import ExcelJS from "exceljs";
import JSZip from "jszip";

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

// GET /api/export/members-bulk - 전체 멤버 일괄 내보내기 (ZIP)
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const searchParams = request.nextUrl.searchParams;

    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
    const half = searchParams.get("half") || "H1"; // H1: 상반기, H2: 하반기
    const memberIds = searchParams.get("memberIds")?.split(",").filter(Boolean);

    // 반기에 따른 월 범위 설정
    const startMonth = half === "H1" ? 1 : 7;
    const endMonth = half === "H1" ? 6 : 12;
    const halfLabel = half === "H1" ? "상반기" : "하반기";

    // 시작일과 종료일 계산
    const startDate = `${year}-${String(startMonth).padStart(2, "0")}-01`;
    const lastDayOfEndMonth = new Date(year, endMonth, 0).getDate();
    const endDate = `${year}-${String(endMonth).padStart(2, "0")}-${String(lastDayOfEndMonth).padStart(2, "0")}`;

    // 멤버 목록 조회
    let membersQuery = supabase.from("members").select("id, full_name");
    if (memberIds && memberIds.length > 0) {
      membersQuery = membersQuery.in("id", memberIds);
    }
    const { data: members, error: membersError } = await membersQuery;

    if (membersError || !members || members.length === 0) {
      return NextResponse.json({ error: "No members found" }, { status: 404 });
    }

    // 반기 공휴일 조회 (내역용)
    const { data: holidays } = await supabase
      .from("holidays")
      .select("holiday_date, description")
      .gte("holiday_date", startDate)
      .lte("holiday_date", endDate);

    const holidayMap = new Map<string, string>();
    holidays?.forEach((h) => {
      holidayMap.set(h.holiday_date, h.description || "");
    });

    // 반기 전체 meal_logs 조회 (내역용)
    const { data: allMealLogs } = await supabase
      .from("meal_logs")
      .select("*")
      .gte("entry_date", startDate)
      .lte("entry_date", endDate);

    // meal_logs를 user_id별로 그룹핑
    const logsByUser = new Map<string, NonNullable<typeof allMealLogs>>();
    allMealLogs?.forEach((log) => {
      const userLogs = logsByUser.get(log.user_id) || [];
      userLogs.push(log);
      logsByUser.set(log.user_id, userLogs);
    });

    // 반기의 모든 날짜 생성
    const allDates: { date: Date; dateStr: string; month: number }[] = [];
    for (let m = startMonth; m <= endMonth; m++) {
      const daysInMonth = new Date(year, m, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, m - 1, day);
        const dateStr = `${year}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        allDates.push({ date, dateStr, month: m });
      }
    }

    // ZIP 파일 생성
    const zip = new JSZip();

    // 각 멤버별로 Excel 파일 생성
    for (const member of members) {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "ACG 식대 Admin";
      workbook.created = new Date();

      // 해당 멤버의 logs를 날짜별 맵으로 변환
      const userLogs = logsByUser.get(member.id) || [];
      type MealLogType = NonNullable<typeof allMealLogs>[number];
      const logMap = new Map<string, MealLogType>();
      userLogs.forEach((log) => {
        logMap.set(log.entry_date, log);
      });

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
      statsSheet.mergeCells("G2:H2");
      statsSheet.mergeCells("K2:M2");
      statsSheet.mergeCells("B2:B3");
      statsSheet.mergeCells("C2:C3");
      statsSheet.mergeCells("D2:D3");
      statsSheet.mergeCells("E2:E3");
      statsSheet.mergeCells("F2:F3");
      statsSheet.mergeCells("I2:I3");
      statsSheet.mergeCells("J2:J3");

      // 헤더 스타일
      statsSheet.getRow(2).font = { bold: true };
      statsSheet.getRow(3).font = { bold: true };
      statsSheet.getRow(2).alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      statsSheet.getRow(3).alignment = { vertical: "middle", horizontal: "center" };

      // Row 4~9: 월별 데이터 (해당 반기 6개월) - 엑셀 수식 사용
      for (let m = startMonth; m <= endMonth; m++) {
        const rowNum = 3 + (m - startMonth + 1);
        const row = statsSheet.getRow(rowNum);

        row.getCell(2).value = year;
        row.getCell(3).value = m;
        row.getCell(4).value = { formula: `COUNTIFS(내역!$F:$F,"업무일",내역!$C:$C,통계!$C${rowNum})` };
        row.getCell(5).value = { formula: `COUNTIFS(내역!$F:$F,"휴일",내역!$C:$C,통계!$C${rowNum})` };
        row.getCell(6).value = { formula: `D${rowNum}*10000` };
        row.getCell(6).numFmt = "#,##0";
        row.getCell(7).value = { formula: `COUNTIFS(내역!$H:$H,"연차/휴무",내역!$C:$C,통계!$C${rowNum})+COUNTIFS(내역!$H:$H,"오전 반차/휴무",내역!$C:$C,통계!$C${rowNum})+COUNTIFS(내역!$H:$H,"오후 반차/휴무",내역!$C:$C,통계!$C${rowNum})` };
        row.getCell(8).value = { formula: `COUNTIFS(내역!$H:$H,"근무",내역!$F:$F,"휴일",내역!$C:$C,통계!$C${rowNum})` };
        row.getCell(9).value = { formula: `F${rowNum}-(10000*(COUNTIFS(내역!$H:$H,"연차/휴무",내역!$C:$C,통계!$C${rowNum})+COUNTIFS(내역!$H:$H,"오전 반차/휴무",내역!$C:$C,통계!$C${rowNum})+COUNTIFS(내역!$H:$H,"오후 반차/휴무",내역!$C:$C,통계!$C${rowNum})+COUNTIFS(내역!$H:$H,"재택근무",내역!$C:$C,통계!$C${rowNum})))+(10000*H${rowNum})` };
        row.getCell(9).numFmt = "#,##0";
        row.getCell(10).value = { formula: `IF(K${rowNum}>0,I${rowNum}-K${rowNum},"")` };
        row.getCell(10).numFmt = "#,##0";
        row.getCell(11).value = { formula: `SUMIFS(내역!$J$4:$J$1048576,내역!$H$4:$H$1048576,"근무",내역!$C$4:$C$1048576,통계!$C${rowNum})` };
        row.getCell(11).numFmt = "#,##0";
        row.getCell(12).value = { formula: `SUMIFS(내역!$N$4:$N$1048576,내역!$H$4:$H$1048576,"근무",내역!$C$4:$C$1048576,통계!$C${rowNum})` };
        row.getCell(12).numFmt = "#,##0";
        row.getCell(13).value = { formula: `SUMIFS(내역!$Q$4:$Q$1048576,내역!$H$4:$H$1048576,"근무",내역!$C$4:$C$1048576,통계!$C${rowNum})` };
        row.getCell(13).numFmt = "#,##0";
      }

      // 안내 문구 (Row 11 - 6개월 후)
      statsSheet.getCell("J11").value = "1일부터 말일까지 사용한 비용의 초과분은 아래의 계좌로 입금\n입금 계좌 : 국민은행 005701-04-142344 (㈜에이시지알)";
      statsSheet.mergeCells("J11:M11");
      statsSheet.getRow(11).alignment = { wrapText: true };

      // 통계 시트 열 너비
      statsSheet.columns = [
        { width: 5 }, { width: 8 }, { width: 5 }, { width: 8 }, { width: 6 },
        { width: 15 }, { width: 10 }, { width: 10 }, { width: 15 }, { width: 12 },
        { width: 10 }, { width: 10 }, { width: 10 }, { width: 50 },
      ];

      // 내역 시트 (A열 빈 열, 수식 참조에 맞춤)
      const detailSheet = workbook.addWorksheet("내역");

      // 헤더 설정
      detailSheet.getRow(1).values = [
        null, null, null, null, null, null, null, "직접 입력",
        null, null, null, null, null, null, null, null, null, null
      ];
      detailSheet.getRow(2).values = [
        null, "일자", null, null, null, null, null, "근태",
        "중식 내역", null, null, null,
        "석식 내역", null, null,
        "조식 내역", null, null
      ];
      detailSheet.getRow(3).values = [
        null, "연도", "월", "일", "요일", "업무일 구분", "특이 사항", null,
        "상호명", "금액", "알림용(작성 금지)", "비고",
        "상호명", "금액", "비고",
        "상호명", "금액", "비고"
      ];

      detailSheet.getRow(1).font = { bold: true };
      detailSheet.getRow(2).font = { bold: true };
      detailSheet.getRow(3).font = { bold: true };
      detailSheet.getRow(3).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };

      detailSheet.columns = [
        { width: 3 }, { width: 8 }, { width: 5 }, { width: 5 }, { width: 5 },
        { width: 12 }, { width: 12 }, { width: 10 },
        { width: 15 }, { width: 10 }, { width: 15 }, { width: 12 },
        { width: 15 }, { width: 10 }, { width: 12 },
        { width: 15 }, { width: 10 }, { width: 12 },
      ];

      // 데이터 행 추가 (A열 빈 열, B~R에 데이터)
      allDates.forEach(({ date, dateStr, month }, index) => {
        const rowNum = index + 4;
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isHoliday = holidayMap.has(dateStr);
        const holidayDesc = holidayMap.get(dateStr) || "";

        const workType = isWeekend || isHoliday ? "휴일" : "업무일";
        const specialNote = isHoliday ? holidayDesc : null;

        const log = logMap.get(dateStr);

        const row = detailSheet.getRow(rowNum);
        row.values = [
          null, // A: 빈 열
          year, // B: 연도
          month, // C: 월
          date.getDate(), // D: 일
          DAY_NAMES[dayOfWeek], // E: 요일
          workType, // F: 업무일 구분
          specialNote, // G: 특이 사항
          log?.attendance || null, // H: 근태
          log?.lunch_store || null, // I: 중식 상호명
          log?.lunch_amount || null, // J: 중식 금액
          null, // K: 알림용
          log?.lunch_payer || null, // L: 중식 비고
          log?.dinner_store || null, // M: 석식 상호명
          log?.dinner_amount || null, // N: 석식 금액
          log?.dinner_payer || null, // O: 석식 비고
          log?.breakfast_store || null, // P: 조식 상호명
          log?.breakfast_amount || null, // Q: 조식 금액
          log?.breakfast_payer || null, // R: 조식 비고
        ];

        // 금액 포맷 (J=10, N=14, Q=17)
        if (log?.lunch_amount) row.getCell(10).numFmt = "#,##0";
        if (log?.dinner_amount) row.getCell(14).numFmt = "#,##0";
        if (log?.breakfast_amount) row.getCell(17).numFmt = "#,##0";

        if (isWeekend || isHoliday) {
          row.eachCell((cell) => {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF5F5F5" },
            };
          });
        }
      });

      // Buffer로 변환하여 ZIP에 추가
      const buffer = await workbook.xlsx.writeBuffer();
      zip.file(`${member.full_name}.xlsx`, buffer);
    }

    // ZIP 생성
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    // Return ZIP file
    const fileName = encodeURIComponent(`식대내역_${year}년_${halfLabel}.zip`);
    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename*=UTF-8''${fileName}`,
      },
    });
  } catch (error) {
    console.error("Bulk export API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
