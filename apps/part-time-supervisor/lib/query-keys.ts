export const queryKeys = {
  dashboard: {
    all: ["dashboard"] as const,
    byDateRange: (start: string, end: string) =>
      ["dashboard", start, end] as const,
    calendar: (year: number, month: number) =>
      ["dashboard", "calendar", year, month] as const,
  },

  jobPostings: {
    all: ["jobPostings"] as const,
    detail: (id: string) => ["jobPostings", id] as const,
  },

  workers: {
    all: ["workers"] as const,
    detail: (id: string) => ["workers", id] as const,
  },

  assignments: {
    all: ["assignments"] as const,
    detail: (id: string) => ["assignments", id] as const,
    byJobPosting: (id: string) => ["assignments", "jobPosting", id] as const,
    byWorker: (id: string) => ["assignments", "worker", id] as const,
  },

  contracts: {
    byWorker: (workerId: string) => ["contracts", workerId] as const,
  },

  roomAssignments: {
    all: ["roomAssignments"] as const,
    byDate: (date: string) => ["roomAssignments", date] as const,
    byDateAndJobPosting: (date: string, jobPostingId: string) =>
      ["roomAssignments", date, jobPostingId] as const,
  },
};
