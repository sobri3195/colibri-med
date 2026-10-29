export type LeadershipPeriod = "all" | "7" | "30";
export interface CountGroup {
  label: string;
  count: number;
}
export interface LeadershipSummary {
  generatedAt: string;
  lastDataUpdatedAt: string | null;
  period: LeadershipPeriod;
  cohortStartAt: string | null;
  totals: {
    requests: number;
    patientsReported: number;
    missions: number;
    activeMissions: number;
    completedMissions: number;
    cancelledMissions: number;
    activeOutsidePeriod: number;
  };
  pending: {
    operator: number;
    medical: number;
    flight: number;
    handover: number;
    flightDelayed: number;
    flightDenied: number;
    completedWithoutHandover: number;
  };
  resources: {
    total: number;
    ready: number;
    unconfirmed: number;
    unavailable: number;
    unknown: number;
  };
  facilities: { total: number; needsConfirmation: number };
  requestsByStatus: CountGroup[];
  missionsByStatus: CountGroup[];
  trend: {
    date: string;
    requests: number;
    completed: number;
    cancelled: number;
  }[];
  stageDurations: { stage: string; samples: number; meanSeconds: number }[];
  quality: {
    invalidTimestamps: number;
    unknownStatuses: number;
    orphanMissions: number;
    orphanHandovers: number;
  };
}
