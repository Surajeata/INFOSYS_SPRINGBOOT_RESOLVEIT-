import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

const applicationTables = {
  complaints: defineTable({
    title: v.string(),
    description: v.string(),
    category: v.union(
      v.literal("TECHNICAL"),
      v.literal("BILLING"), 
      v.literal("SERVICE"),
      v.literal("GENERAL"),
      v.literal("URGENT"),
      v.literal("HARASSMENT"),
      v.literal("DISCRIMINATION"),
      v.literal("SAFETY"),
      v.literal("POLICY_VIOLATION"),
      v.literal("OTHER")
    ),
    subcategory: v.optional(v.string()),
    priority: v.union(
      v.literal("LOW"),
      v.literal("MEDIUM"),
      v.literal("HIGH"),
      v.literal("CRITICAL")
    ),
    status: v.union(
      v.literal("SUBMITTED"),
      v.literal("IN_PROGRESS"),
      v.literal("UNDER_REVIEW"),
      v.literal("RESOLVED"),
      v.literal("CLOSED"),
      v.literal("ESCALATED"),
      v.literal("PENDING_INFO"),
      v.literal("REOPENED")
    ),
    userId: v.optional(v.id("users")), // Optional for anonymous complaints
    isAnonymous: v.optional(v.boolean()),
    anonymousEmail: v.optional(v.string()),
    anonymousPhone: v.optional(v.string()),
    assignedTo: v.optional(v.id("users")),
    resolution: v.optional(v.string()),
    resolvedAt: v.optional(v.number()),
    escalatedAt: v.optional(v.number()),
    escalationReason: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
    location: v.optional(v.string()),
    attachments: v.optional(v.array(v.id("_storage"))),
    urgencyLevel: v.optional(v.number()), // 1-10 scale
    satisfactionRating: v.optional(v.number()), // 1-5 rating after resolution
    feedbackComments: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_assigned", ["assignedTo"])
    .index("by_category", ["category"])
    .index("by_priority", ["priority"])
    .index("by_anonymous", ["isAnonymous"])
    .index("by_escalated", ["escalatedAt"])
    .index("by_due_date", ["dueDate"]),

  statusHistory: defineTable({
    complaintId: v.id("complaints"),
    status: v.union(
      v.literal("SUBMITTED"),
      v.literal("IN_PROGRESS"),
      v.literal("UNDER_REVIEW"),
      v.literal("RESOLVED"),
      v.literal("CLOSED"),
      v.literal("ESCALATED"),
      v.literal("PENDING_INFO"),
      v.literal("REOPENED")
    ),
    changedBy: v.optional(v.id("users")), // Optional for system changes
    changedByName: v.optional(v.string()),
    notes: v.optional(v.string()),
    timestamp: v.number(),
    isSystemGenerated: v.optional(v.boolean()),
    previousStatus: v.optional(v.string()),
  }).index("by_complaint", ["complaintId"]),

  internalNotes: defineTable({
    complaintId: v.id("complaints"),
    note: v.string(),
    createdBy: v.id("users"),
    isPublic: v.boolean(),
    noteType: v.optional(v.union(
      v.literal("GENERAL"),
      v.literal("ESCALATION"),
      v.literal("RESOLUTION"),
      v.literal("FOLLOW_UP"),
      v.literal("SYSTEM")
    )),
    attachments: v.optional(v.array(v.id("_storage"))),
  }).index("by_complaint", ["complaintId"]),

  userProfiles: defineTable({
    userId: v.id("users"),
    firstName: v.string(),
    lastName: v.string(),
    phoneNumber: v.optional(v.string()),
    role: v.union(v.literal("USER"), v.literal("ADMIN"), v.literal("MODERATOR"), v.literal("SUPER_ADMIN")),
    department: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    lastLoginAt: v.optional(v.number()),
    permissions: v.optional(v.array(v.string())),
    notificationPreferences: v.optional(v.object({
      email: v.boolean(),
      sms: v.boolean(),
      inApp: v.boolean(),
    })),
  }).index("by_user", ["userId"])
    .index("by_role", ["role"])
    .index("by_department", ["department"]),

  escalationRules: defineTable({
    category: v.string(),
    priority: v.string(),
    autoEscalateAfterHours: v.number(),
    escalateTo: v.id("users"),
    isActive: v.boolean(),
    conditions: v.optional(v.array(v.string())),
  }).index("by_category_priority", ["category", "priority"]),

  notifications: defineTable({
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
    isRead: v.boolean(),
    readAt: v.optional(v.number()),
  }).index("by_user", ["userId"])
    .index("by_complaint", ["complaintId"]),

  analytics: defineTable({
    date: v.string(), // YYYY-MM-DD format
    totalComplaints: v.number(),
    resolvedComplaints: v.number(),
    averageResolutionTime: v.number(),
    categoryBreakdown: v.object({
      TECHNICAL: v.number(),
      BILLING: v.number(),
      SERVICE: v.number(),
      GENERAL: v.number(),
      URGENT: v.number(),
      HARASSMENT: v.number(),
      DISCRIMINATION: v.number(),
      SAFETY: v.number(),
      POLICY_VIOLATION: v.number(),
      OTHER: v.number(),
    }),
    priorityBreakdown: v.object({
      LOW: v.number(),
      MEDIUM: v.number(),
      HIGH: v.number(),
      CRITICAL: v.number(),
    }),
    statusBreakdown: v.object({
      SUBMITTED: v.number(),
      IN_PROGRESS: v.number(),
      UNDER_REVIEW: v.number(),
      RESOLVED: v.number(),
      CLOSED: v.number(),
      ESCALATED: v.number(),
      PENDING_INFO: v.number(),
      REOPENED: v.number(),
    }),
  }).index("by_date", ["date"]),

  systemSettings: defineTable({
    key: v.string(),
    value: v.union(v.string(), v.number(), v.boolean()),
    description: v.optional(v.string()),
    updatedBy: v.optional(v.id("users")),
  }).index("by_key", ["key"]),

  auditLog: defineTable({
    userId: v.optional(v.id("users")),
    action: v.string(),
    entityType: v.string(),
    entityId: v.string(),
    oldValues: v.optional(v.object({})),
    newValues: v.optional(v.object({})),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    timestamp: v.number(),
  }).index("by_user", ["userId"])
    .index("by_entity", ["entityType", "entityId"])
    .index("by_timestamp", ["timestamp"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
