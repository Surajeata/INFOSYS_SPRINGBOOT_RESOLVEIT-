import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const createNotification = mutation({
  args: {
    userId: v.id("users"),
    complaintId: v.optional(v.id("complaints")),
    title: v.string(),
    message: v.string(),
    type: v.union(
      v.literal("COMPLAINT_CREATED"),
      v.literal("STATUS_UPDATED"),
      v.literal("ASSIGNED"),
      v.literal("ESCALATED"),
      v.literal("RESOLVED"),
      v.literal("COMMENT_ADDED"),
      v.literal("DUE_DATE_APPROACHING"),
      v.literal("OVERDUE"),
      v.literal("AUTO_ESCALATED")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notifications", {
      ...args,
      isRead: false,
    });
  },
});

export const getUserNotifications = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(args.limit || 50);
  },
});

export const markNotificationRead = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Must be logged in");

    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.userId !== userId) {
      throw new Error("Notification not found");
    }

    await ctx.db.patch(args.notificationId, { isRead: true });
  },
});

export const markAllNotificationsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Must be logged in");

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isRead"), false))
      .collect();

    await Promise.all(
      notifications.map((notification) =>
        ctx.db.patch(notification._id, { isRead: true })
      )
    );
  },
});

export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;

    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isRead"), false))
      .collect();

    return unreadNotifications.length;
  },
});
