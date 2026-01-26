export const queryKeys = {
  // Members
  members: {
    all: ["members"] as const,
    detail: (id: string) => ["members", id] as const,
  },

  // Meal Logs
  mealLogs: {
    all: ["mealLogs"] as const,
    byUser: (userId: string) => ["mealLogs", "user", userId] as const,
    byDate: (date: string) => ["mealLogs", "date", date] as const,
    byUserAndMonth: (userId: string, year: number, month: number) =>
      ["mealLogs", "user", userId, year, month] as const,
    byMonth: (year: number, month: number) =>
      ["mealLogs", "month", year, month] as const,
  },

  // User Monthly Stats
  stats: {
    all: ["stats"] as const,
    monthly: (year: number, month: number) =>
      ["stats", "monthly", year, month] as const,
    byUser: (userId: string, year: number, month: number) =>
      ["stats", "user", userId, year, month] as const,
  },

  // Holidays
  holidays: {
    all: ["holidays"] as const,
    byYear: (year: number) => ["holidays", "year", year] as const,
    byMonth: (year: number, month: number) =>
      ["holidays", "month", year, month] as const,
  },

  // Settings
  settings: {
    all: ["settings"] as const,
    global: ["settings", "global"] as const,
    workdays: (year: number, month: number) =>
      ["settings", "workdays", year, month] as const,
    monthlyAllowances: (year: number, month: number) =>
      ["settings", "monthlyAllowances", year, month] as const,
  },

  // Sync Queue
  syncQueue: {
    all: ["syncQueue"] as const,
    pending: ["syncQueue", "pending"] as const,
  },

  // Dashboard
  dashboard: {
    summary: (year: number, month: number) =>
      ["dashboard", "summary", year, month] as const,
    alerts: (year: number, month: number) =>
      ["dashboard", "alerts", year, month] as const,
    popularStores: (year: number, month: number) =>
      ["dashboard", "popularStores", year, month] as const,
    memberSpending: (year: number, month: number) =>
      ["dashboard", "memberSpending", year, month] as const,
    trends: (year: number, month: number) =>
      ["dashboard", "trends", year, month] as const,
  },

  // Lunch Groups
  lunchGroups: {
    all: ["lunchGroups"] as const,
    byWeek: (weekStartDate: string) =>
      ["lunchGroups", "week", weekStartDate] as const,
    settings: ["lunchGroups", "settings"] as const,
    fixedSchedules: ["lunchGroups", "fixedSchedules"] as const,
  },

  // Monthly Drinks
  monthly: {
    all: ["monthly"] as const,
  },
};
