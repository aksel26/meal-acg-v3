export const queryKeys = {
  // Members
  members: {
    all: ["members"] as const,
    active: ["members", { excludeStatus: true }] as const,
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
    settlement: (year: number, month: number) =>
      ["dashboard", "settlement", year, month] as const,
  },

  // Lunch Groups
  lunchGroups: {
    all: ["lunchGroups"] as const,
    byWeek: (weekStartDate: string) =>
      ["lunchGroups", "week", weekStartDate] as const,
    settings: ["lunchGroups", "settings"] as const,
    fixedSchedules: ["lunchGroups", "fixedSchedules"] as const,
    excludedMembers: (weekStartDate: string) =>
      ["lunchGroups", "excludedMembers", weekStartDate] as const,
  },

  // Monthly Drinks
  monthly: {
    all: ["monthly"] as const,
    collections: ["monthly", "collections"] as const,
    collection: (id: string) => ["monthly", "collections", id] as const,
  },

  // Organizations
  organizations: {
    all: ["organizations"] as const,
    detail: (id: string) => ["organizations", id] as const,
    tree: (id: string) => ["organizations", id, "tree"] as const,
  },

  // Divisions
  divisions: {
    all: ["divisions"] as const,
    byOrg: (orgId: string) => ["divisions", "org", orgId] as const,
  },

  // Teams
  teams: {
    all: ["teams"] as const,
    byOrg: (orgId: string) => ["teams", "org", orgId] as const,
  },

  // Budget Allocations
  budgetAllocations: {
    all: ["budgetAllocations"] as const,
    byPeriod: (period: string) => ["budgetAllocations", "period", period] as const,
    byPeriodAndType: (period: string, type: string) =>
      ["budgetAllocations", "period", period, "type", type] as const,
    detail: (id: string) => ["budgetAllocations", id] as const,
  },

  // Budget Summary
  budgetSummary: {
    all: ["budgetSummary"] as const,
    byPeriod: (period: string) => ["budgetSummary", "period", period] as const,
    byPeriodAndType: (period: string, type: string) =>
      ["budgetSummary", "period", period, "type", type] as const,
  },

  // Member Statuses
  memberStatuses: {
    all: ["memberStatuses"] as const,
    active: ["memberStatuses", "active"] as const,
    list: (filters?: Record<string, string>) =>
      ["memberStatuses", "list", filters] as const,
    history: (memberId: string) =>
      ["memberStatuses", "history", memberId] as const,
  },

  // Points Overview
  pointsOverview: {
    byPeriod: (period: string) => ["pointsOverview", period] as const,
  },

  // Notifications
  notifications: {
    subscriptions: ["notifications", "subscriptions"] as const,
    logs: ["notifications", "logs"] as const,
  },

  // Dayoffs (근태)
  dayoffs: {
    all: ["dayoffs"] as const,
    byMonth: (year: number, month: number) =>
      ["dayoffs", "month", year, month] as const,
    byTarget: (targetId: string) => ["dayoffs", "target", targetId] as const,
    detail: (id: string) => ["dayoffs", id] as const,
    stats: (year: number, month: number) =>
      ["dayoffs", "stats", year, month] as const,
  },

  // Leave Types (근태 유형)
  leaveTypes: {
    all: ["leaveTypes"] as const,
  },

  // Positions (직급)
  positions: {
    all: ["positions"] as const,
  },

  // Titles (직책)
  titles: {
    all: ["titles"] as const,
  },

  // Leave Balances (연차 현황)
  leaveBalances: {
    all: ["leaveBalances"] as const,
    byYear: (year: number) => ["leaveBalances", year] as const,
  },

  // Usage Records
  usageRecords: {
    all: ["usageRecords"] as const,
    byPeriod: (period: string) => ["usageRecords", "period", period] as const,
    byMember: (memberId: string) => ["usageRecords", "member", memberId] as const,
    detail: (id: string) => ["usageRecords", id] as const,
    auditLogs: (recordId?: string) =>
      recordId
        ? ["usageRecords", "auditLogs", recordId] as const
        : ["usageRecords", "auditLogs"] as const,
  },
};
