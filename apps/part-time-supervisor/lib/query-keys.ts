export const queryKeys = {
  dashboard: {
    all: ["dashboard"] as const,
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
};
