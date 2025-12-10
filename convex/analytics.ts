import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getDashboardStats = query({
  args: {
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in");
    }

    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!userProfile || userProfile.role === "USER") {
      throw new Error("Insufficient permissions");
    }

    const now = Date.now();
    const dateFrom = args.dateFrom || (now - 30 * 24 * 60 * 60 * 1000); // Default 30 days
    const dateTo = args.dateTo || now;

    // Get all complaints within date range
    const allComplaints = await ctx.db.query("complaints").collect();
    const filteredComplaints = allComplaints.filter(complaint => 
      complaint._creationTime >= dateFrom && complaint._creationTime <= dateTo
    );

    // Calculate basic stats
    const totalComplaints = filteredComplaints.length;
    const resolvedComplaints = filteredComplaints.filter(c => 
      c.status === "RESOLVED" || c.status === "CLOSED"
    ).length;
    const pendingComplaints = filteredComplaints.filter(c => 
      ["SUBMITTED", "IN_PROGRESS", "UNDER_REVIEW", "PENDING_INFO"].includes(c.status)
    ).length;
    const escalatedComplaints = filteredComplaints.filter(c => c.status === "ESCALATED").length;
    const overdueComplaints = filteredComplaints.filter(c => 
      c.dueDate && c.dueDate < now && !["RESOLVED", "CLOSED"].includes(c.status)
    ).length;

    // Calculate resolution time
    const resolvedWithTime = filteredComplaints.filter(c => c.resolvedAt);
    const averageResolutionTime = resolvedWithTime.length > 0 
      ? resolvedWithTime.reduce((sum, c) => sum + (c.resolvedAt! - c._creationTime), 0) / resolvedWithTime.length
      : 0;

    // Category breakdown
    const categoryBreakdown = {
      TECHNICAL: 0,
      BILLING: 0,
      SERVICE: 0,
      GENERAL: 0,
      URGENT: 0,
      HARASSMENT: 0,
      DISCRIMINATION: 0,
      SAFETY: 0,
      POLICY_VIOLATION: 0,
      OTHER: 0,
    };

    // Priority breakdown
    const priorityBreakdown = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    };

    // Status breakdown
    const statusBreakdown = {
      SUBMITTED: 0,
      IN_PROGRESS: 0,
      UNDER_REVIEW: 0,
      RESOLVED: 0,
      CLOSED: 0,
      ESCALATED: 0,
      PENDING_INFO: 0,
      REOPENED: 0,
    };

    filteredComplaints.forEach(complaint => {
      if (categoryBreakdown.hasOwnProperty(complaint.category)) {
        categoryBreakdown[complaint.category as keyof typeof categoryBreakdown]++;
      }
      if (priorityBreakdown.hasOwnProperty(complaint.priority)) {
        priorityBreakdown[complaint.priority as keyof typeof priorityBreakdown]++;
      }
      if (statusBreakdown.hasOwnProperty(complaint.status)) {
        statusBreakdown[complaint.status as keyof typeof statusBreakdown]++;
      }
    });

    // Resolution rate
    const resolutionRate = totalComplaints > 0 ? (resolvedComplaints / totalComplaints) * 100 : 0;

    // Get staff workload
    const staff = await ctx.db
      .query("userProfiles")
      .withIndex("by_role", (q) => q.eq("role", "ADMIN"))
      .collect();
    
    const moderators = await ctx.db
      .query("userProfiles")
      .withIndex("by_role", (q) => q.eq("role", "MODERATOR"))
      .collect();

    const allStaff = [...staff, ...moderators];
    const staffWorkload = await Promise.all(
      allStaff.map(async (member) => {
        const assigned = filteredComplaints.filter(c => c.assignedTo === member.userId);
        const pending = assigned.filter(c => 
          ["SUBMITTED", "IN_PROGRESS", "UNDER_REVIEW", "PENDING_INFO"].includes(c.status)
        );
        const resolved = assigned.filter(c => 
          ["RESOLVED", "CLOSED"].includes(c.status)
        );

        return {
          staffId: member.userId,
          name: `${member.firstName} ${member.lastName}`,
          role: member.role,
          totalAssigned: assigned.length,
          pending: pending.length,
          resolved: resolved.length,
          resolutionRate: assigned.length > 0 ? (resolved.length / assigned.length) * 100 : 0,
        };
      })
    );

    return {
      totalComplaints,
      resolvedComplaints,
      pendingComplaints,
      escalatedComplaints,
      overdueComplaints,
      averageResolutionTime,
      resolutionRate,
      categoryBreakdown,
      priorityBreakdown,
      statusBreakdown,
      staffWorkload,
      dateRange: { from: dateFrom, to: dateTo },
    };
  },
});

export const getTimeSeriesData = query({
  args: {
    dateFrom: v.number(),
    dateTo: v.number(),
    groupBy: v.union(v.literal("day"), v.literal("week"), v.literal("month")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in");
    }

    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!userProfile || userProfile.role === "USER") {
      throw new Error("Insufficient permissions");
    }

    const allComplaints = await ctx.db.query("complaints").collect();
    const filteredComplaints = allComplaints.filter(complaint => 
      complaint._creationTime >= args.dateFrom && complaint._creationTime <= args.dateTo
    );

    // Group complaints by time period
    const timeSeriesData: Array<{
      date: string;
      submitted: number;
      resolved: number;
      escalated: number;
    }> = [];

    const groupByMs = args.groupBy === "day" ? 24 * 60 * 60 * 1000 :
                     args.groupBy === "week" ? 7 * 24 * 60 * 60 * 1000 :
                     30 * 24 * 60 * 60 * 1000; // month approximation

    for (let time = args.dateFrom; time <= args.dateTo; time += groupByMs) {
      const endTime = Math.min(time + groupByMs, args.dateTo);
      const periodComplaints = filteredComplaints.filter(c => 
        c._creationTime >= time && c._creationTime < endTime
      );

      const resolvedInPeriod = filteredComplaints.filter(c => 
        c.resolvedAt && c.resolvedAt >= time && c.resolvedAt < endTime
      );

      const escalatedInPeriod = filteredComplaints.filter(c => 
        c.escalatedAt && c.escalatedAt >= time && c.escalatedAt < endTime
      );

      timeSeriesData.push({
        date: new Date(time).toISOString().split('T')[0],
        submitted: periodComplaints.length,
        resolved: resolvedInPeriod.length,
        escalated: escalatedInPeriod.length,
      });
    }

    return timeSeriesData;
  },
});

export const exportComplaintsCSV = query({
  args: {
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
    status: v.optional(v.string()),
    category: v.optional(v.string()),
    priority: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in");
    }

    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!userProfile || userProfile.role === "USER") {
      throw new Error("Insufficient permissions");
    }

    const now = Date.now();
    const dateFrom = args.dateFrom || (now - 30 * 24 * 60 * 60 * 1000);
    const dateTo = args.dateTo || now;

    let complaints = await ctx.db.query("complaints").collect();

    // Apply filters
    complaints = complaints.filter(complaint => {
      if (complaint._creationTime < dateFrom || complaint._creationTime > dateTo) return false;
      if (args.status && complaint.status !== args.status) return false;
      if (args.category && complaint.category !== args.category) return false;
      if (args.priority && complaint.priority !== args.priority) return false;
      return true;
    });

    // Get additional data for each complaint
    const csvData = await Promise.all(
      complaints.map(async (complaint) => {
        let userName = "Anonymous User";
        let userEmail = complaint.anonymousEmail || "N/A";

        if (!complaint.isAnonymous && complaint.userId) {
          const userProfile = await ctx.db
            .query("userProfiles")
            .withIndex("by_user", (q) => q.eq("userId", complaint.userId!))
            .first();
          
          const user = await ctx.db.get(complaint.userId);
          
          if (userProfile) {
            userName = `${userProfile.firstName} ${userProfile.lastName}`;
          }
          if (user?.email) {
            userEmail = user.email;
          }
        }

        let assignedUserName = "Unassigned";
        if (complaint.assignedTo) {
          const assignedProfile = await ctx.db
            .query("userProfiles")
            .withIndex("by_user", (q) => q.eq("userId", complaint.assignedTo!))
            .first();
          if (assignedProfile) {
            assignedUserName = `${assignedProfile.firstName} ${assignedProfile.lastName}`;
          }
        }

        const resolutionTime = complaint.resolvedAt 
          ? Math.round((complaint.resolvedAt - complaint._creationTime) / (1000 * 60 * 60)) // hours
          : null;

        return {
          id: complaint._id,
          title: complaint.title,
          category: complaint.category,
          subcategory: complaint.subcategory || "",
          priority: complaint.priority,
          status: complaint.status,
          submittedBy: userName,
          submitterEmail: userEmail,
          assignedTo: assignedUserName,
          location: complaint.location || "",
          tags: complaint.tags?.join(", ") || "",
          isAnonymous: complaint.isAnonymous ? "Yes" : "No",
          submittedDate: new Date(complaint._creationTime).toISOString(),
          dueDate: complaint.dueDate ? new Date(complaint.dueDate).toISOString() : "",
          resolvedDate: complaint.resolvedAt ? new Date(complaint.resolvedAt).toISOString() : "",
          escalatedDate: complaint.escalatedAt ? new Date(complaint.escalatedAt).toISOString() : "",
          resolutionTimeHours: resolutionTime,
          resolution: complaint.resolution || "",
          escalationReason: complaint.escalationReason || "",
          urgencyLevel: complaint.urgencyLevel || "",
          satisfactionRating: complaint.satisfactionRating || "",
        };
      })
    );

    return csvData;
  },
});

export const updateAnalytics = mutation({
  args: {
    date: v.string(),
  },
  handler: async (ctx, args) => {
    // This would typically be called by a cron job
    const startOfDay = new Date(args.date).getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

    const complaints = await ctx.db.query("complaints").collect();
    const dayComplaints = complaints.filter(c => 
      c._creationTime >= startOfDay && c._creationTime < endOfDay
    );

    const resolvedComplaints = complaints.filter(c => 
      c.resolvedAt && c.resolvedAt >= startOfDay && c.resolvedAt < endOfDay
    );

    const totalResolutionTime = resolvedComplaints.reduce((sum, c) => 
      sum + (c.resolvedAt! - c._creationTime), 0
    );
    const averageResolutionTime = resolvedComplaints.length > 0 
      ? totalResolutionTime / resolvedComplaints.length 
      : 0;

    // Calculate breakdowns
    const categoryBreakdown = {
      TECHNICAL: 0, BILLING: 0, SERVICE: 0, GENERAL: 0, URGENT: 0,
      HARASSMENT: 0, DISCRIMINATION: 0, SAFETY: 0, POLICY_VIOLATION: 0, OTHER: 0,
    };
    const priorityBreakdown = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    const statusBreakdown = {
      SUBMITTED: 0, IN_PROGRESS: 0, UNDER_REVIEW: 0, RESOLVED: 0,
      CLOSED: 0, ESCALATED: 0, PENDING_INFO: 0, REOPENED: 0,
    };

    dayComplaints.forEach(complaint => {
      if (categoryBreakdown.hasOwnProperty(complaint.category)) {
        categoryBreakdown[complaint.category as keyof typeof categoryBreakdown]++;
      }
      if (priorityBreakdown.hasOwnProperty(complaint.priority)) {
        priorityBreakdown[complaint.priority as keyof typeof priorityBreakdown]++;
      }
      if (statusBreakdown.hasOwnProperty(complaint.status)) {
        statusBreakdown[complaint.status as keyof typeof statusBreakdown]++;
      }
    });

    // Check if analytics record exists for this date
    const existingAnalytics = await ctx.db
      .query("analytics")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .first();

    const analyticsData = {
      date: args.date,
      totalComplaints: dayComplaints.length,
      resolvedComplaints: resolvedComplaints.length,
      averageResolutionTime,
      categoryBreakdown,
      priorityBreakdown,
      statusBreakdown,
    };

    if (existingAnalytics) {
      await ctx.db.patch(existingAnalytics._id, analyticsData);
    } else {
      await ctx.db.insert("analytics", analyticsData);
    }

    return analyticsData;
  },
});

export const updateDailyAnalytics = internalMutation({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toISOString().split('T')[0];
    const startOfDay = new Date(today).getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

    const complaints = await ctx.db.query("complaints").collect();
    const dayComplaints = complaints.filter(c => 
      c._creationTime >= startOfDay && c._creationTime < endOfDay
    );

    return {
      date: today,
      totalComplaints: dayComplaints.length,
      processed: true
    };
  },
});
