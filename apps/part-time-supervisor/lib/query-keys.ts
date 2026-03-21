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

  costManagement: {
    all: ["costManagement"] as const,
    byMonth: (year: number, month: number) =>
      ["costManagement", year, month] as const,
  },

  workRecords: {
    all: ["workRecords"] as const,
    byAssignment: (assignmentId: string) =>
      ["workRecords", assignmentId] as const,
  },

  interviewPersonnel: {
    all: ["interviewPersonnel"] as const,
    detail: (id: string) => ["interviewPersonnel", id] as const,
  },

  interviewWorkRecords: {
    all: ["interviewWorkRecords"] as const,
    byPersonnel: (personnelId: string) =>
      ["interviewWorkRecords", personnelId] as const,
    byMonth: (year: number, month: number) =>
      ["interviewWorkRecords", year, month] as const,
  },

  interviewSettlement: {
    all: ["interviewSettlement"] as const,
    byMonth: (year: number, month: number) =>
      ["interviewSettlement", year, month] as const,
  },

  interviewExpenseReports: {
    all: ["interviewExpenseReports"] as const,
    byJobPosting: (jobPostingId: string) =>
      ["interviewExpenseReports", jobPostingId] as const,
    detail: (id: string) => ["interviewExpenseReports", id] as const,
  },

  interviewJobPostings: {
    all: ["interviewJobPostings"] as const,
    detail: (id: string) => ["interviewJobPostings", id] as const,
  },

  interviewJobAssignments: {
    all: ["interviewJobAssignments"] as const,
    byJobPosting: (id: string) =>
      ["interviewJobAssignments", id] as const,
  },
};
