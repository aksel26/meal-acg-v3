import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const KST = "Asia/Seoul";

export const formatDate = (date?: dayjs.ConfigType) => {
  return dayjs(date).tz(KST).format("YYYY-MM-DD");
};

export const formatTime = (date?: dayjs.ConfigType) => {
  return dayjs(date).tz(KST).format("HH:mm:ss");
};

export const formatDateTime = (date?: dayjs.ConfigType) => {
  return dayjs(date).tz(KST).format("YYYY-MM-DD HH:mm:ss");
};

export const formatDateTimeShort = (date?: dayjs.ConfigType) => {
  return dayjs(date).tz(KST).format("MM-DD HH:mm");
};

export const formatDateKorean = (date?: dayjs.ConfigType) => {
  return dayjs(date).tz(KST).format("YYYY년 MM월 DD일");
};

export const formatDateTimeKorean = (date?: dayjs.ConfigType) => {
  return dayjs(date).tz(KST).format("YYYY년 MM월 DD일 HH시 mm분");
};

export const getToday = () => {
  return dayjs().tz(KST).format("YYYY-MM-DD");
};

export const getNow = () => {
  return dayjs().tz(KST);
};

export const isToday = (date: dayjs.ConfigType) => {
  return dayjs(date).tz(KST).isSame(dayjs().tz(KST), "day");
};

export const getRelativeTime = (date: dayjs.ConfigType) => {
  const target = dayjs(date).tz(KST);
  const now = dayjs().tz(KST);

  const diffInMinutes = now.diff(target, "minute");
  const diffInHours = now.diff(target, "hour");
  const diffInDays = now.diff(target, "day");

  if (diffInMinutes < 1) return "방금 전";
  if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
  if (diffInHours < 24) return `${diffInHours}시간 전`;
  if (diffInDays < 7) return `${diffInDays}일 전`;

  return formatDate(date);
};
