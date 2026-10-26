import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(timezone);

const KST = "Asia/Seoul";

// 서버는 UTC로 돌기 때문에 KST 기준으로 주차를 계산한다.
// 월요일 00:00~09:00 KST 사이에 UTC 날짜로 계산하면 지난주로 잡힌다.
function nowKST() {
  return dayjs().tz(KST);
}

// 이번 주 월요일 (YYYY-MM-DD)
export function getWeekStartDate(date: dayjs.Dayjs = nowKST()): string {
  const day = date.day();
  // 일요일(0)이면 -6, 그 외에는 1 - day
  const diff = day === 0 ? -6 : 1 - day;
  return date.add(diff, "day").format("YYYY-MM-DD");
}

// 다음 주 월요일 (YYYY-MM-DD)
export function getNextWeekStartDate(date: dayjs.Dayjs = nowKST()): string {
  return dayjs(getWeekStartDate(date)).add(7, "day").format("YYYY-MM-DD");
}
