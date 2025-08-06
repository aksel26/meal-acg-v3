export function getSemesterInfo(
  month: number,
  year?: number
): {
  semester: "상반기" | "하반기";
  folderName: string;
  currentYear: number;
} {
  const currentYear = year || new Date().getFullYear();
  const semester = month <= 6 ? "상반기" : "하반기";
  const folderName = `${currentYear} ${semester}`;

  return {
    semester,
    folderName,
    currentYear,
  };
}

export function formatDateString(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseDateString(dateString: string): { year: number; month: number; day: number } {
  const parts = dateString.split("-").map(Number);
  const [year = 0, month = 0, day = 0] = parts;
  return { year, month, day };
}
