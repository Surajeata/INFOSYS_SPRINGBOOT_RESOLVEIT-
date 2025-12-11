import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run auto-escalation check every 30 minutes
crons.interval(
  "auto-escalation-check",
  { minutes: 30 },
  internal.autoEscalation.checkAutoEscalation,
  {}
);

// Update daily analytics at midnight
crons.cron(
  "daily-analytics-update", 
  "0 0 * * *", // Every day at midnight
  internal.analytics.updateDailyAnalytics,
  {}
);

export default crons;
