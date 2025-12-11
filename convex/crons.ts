import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();


crons.interval(
  "auto-escalation-check",
  { minutes: 30 },
  internal.autoEscalation.checkAutoEscalation,
  {}
);


crons.cron(
  "daily-analytics-update", 
  "0 0 * * *", 
  internal.analytics.updateDailyAnalytics,
  {}
);

export default crons;
