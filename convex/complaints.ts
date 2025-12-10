import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const createComplaint = mutation({
  args: {
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
    priority: v.optional(v.union(
      v.literal("LOW"),
      v.literal("MEDIUM"),
      v.literal("HIGH"),
      v.literal("CRITICAL")
    )),
    isAnonymous: v.optional(v.boolean()),
    anonymousEmail: v.optional(v.string()),
    anonymousPhone: v.optional(v.string()),
    location: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    attachments: v.optional(v.array(v.id("_storage"))),
    urgencyLevel: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const isAnonymous = args.isAnonymous || false;
    
    if (!isAnonymous && !userId) {
      throw new Error("Must be logged in to create non-anonymous complaint");
    }

    if (isAnonymous && !args.anonymousEmail) {
      throw new Error("Email is required for anonymous complaints");
    }

    // Auto-assign priority based on category if not provided
    let priority = args.priority || "MEDIUM";
    if (args.category === "URGENT" || args.category === "SAFETY" || args.category === "HARASSMENT") {
      priority = "HIGH";
    }
    if (args.category === "DISCRIMINATION") {
      priority = "CRITICAL";
    }

    // Calculate due date based on priority
    const now = Date.now();
    let dueDate = now + (7 * 24 * 60 * 60 * 1000); // Default 7 days
    switch (priority) {
      case "CRITICAL":
        dueDate = now + (24 * 60 * 60 * 1000); // 1 day
        break;
      case "HIGH":
        dueDate = now + (3 * 24 * 60 * 60 * 1000); // 3 days
        break;
      case "MEDIUM":
        dueDate = now + (7 * 24 * 60 * 60 * 1000); // 7 days
        break;
      case "LOW":
        dueDate = now + (14 * 24 * 60 * 60 * 1000); // 14 days
        break;
    }

    const complaintId = await ctx.db.insert("complaints", {
      title: args.title,
      description: args.description,
      category: args.category,
      subcategory: args.subcategory,
      priority,
      status: "SUBMITTED",
      userId: isAnonymous ? undefined : (userId || undefined),
      isAnonymous,
      anonymousEmail: args.anonymousEmail,
      anonymousPhone: args.anonymousPhone,
      location: args.location,
      tags: args.tags,
      attachments: args.attachments,
      urgencyLevel: args.urgencyLevel,
      dueDate,
    });

    // Create initial status history
    let changedByName = "System";
    if (!isAnonymous && userId) {
      const userProfile = await ctx.db
        .query("userProfiles")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
      if (userProfile) {
        changedByName = `${userProfile.firstName} ${userProfile.lastName}`;
      }
    } else if (isAnonymous) {
      changedByName = "Anonymous User";
    }

    await ctx.db.insert("statusHistory", {
      complaintId,
      status: "SUBMITTED",
      changedBy: isAnonymous ? undefined : (userId || undefined),
      changedByName,
      notes: "Complaint submitted",
      timestamp: Date.now(),
      isSystemGenerated: true,
    });

    // Create audit log entry
    await ctx.db.insert("auditLog", {
      userId: isAnonymous ? undefined : (userId || undefined),
      action: "CREATE_COMPLAINT",
      entityType: "complaints",
      entityId: complaintId,
      newValues: { title: args.title, category: args.category, priority },
      timestamp: Date.now(),
    });

    return complaintId;
  },
});

export const getUserComplaints = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const complaints = await ctx.db
      .query("complaints")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    return complaints;
  },
});

export const getAnonymousComplaint = query({
  args: { 
    complaintId: v.id("complaints"),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const complaint = await ctx.db.get(args.complaintId);
    if (!complaint || !complaint.isAnonymous || complaint.anonymousEmail !== args.email) {
      return null;
    }

    return complaint;
  },
});

export const getAllComplaints = query({
  args: {
    status: v.optional(v.string()),
    category: v.optional(v.string()),
    priority: v.optional(v.string()),
    assignedTo: v.optional(v.id("users")),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in");
    }

    // Check if user is admin/moderator
    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!userProfile || userProfile.role === "USER") {
      throw new Error("Insufficient permissions");
    }

    let query = ctx.db.query("complaints").order("desc");

    // Apply filters
    if (args.status) {
      query = ctx.db.query("complaints").withIndex("by_status", (q) => q.eq("status", args.status as any));
    }
    if (args.category) {
      query = ctx.db.query("complaints").withIndex("by_category", (q) => q.eq("category", args.category as any));
    }
    if (args.priority) {
      query = ctx.db.query("complaints").withIndex("by_priority", (q) => q.eq("priority", args.priority as any));
    }
    if (args.assignedTo) {
      query = ctx.db.query("complaints").withIndex("by_assigned", (q) => q.eq("assignedTo", args.assignedTo));
    }

    let complaints = await query.collect();

    // Apply date filters
    if (args.dateFrom || args.dateTo) {
      complaints = complaints.filter(complaint => {
        const creationTime = complaint._creationTime;
        if (args.dateFrom && creationTime < args.dateFrom) return false;
        if (args.dateTo && creationTime > args.dateTo) return false;
        return true;
      });
    }

    // Apply limit
    if (args.limit) {
      complaints = complaints.slice(0, args.limit);
    }

    // Get user details for each complaint
    const complaintsWithUsers = await Promise.all(
      complaints.map(async (complaint) => {
        let userName = "Anonymous User";
        let userEmail = complaint.anonymousEmail || "N/A";

        if (!complaint.isAnonymous && complaint.userId) {
          const userProfile = await ctx.db
            .query("userProfiles")
            .withIndex("by_user", (q) => q.eq("userId", complaint.userId!))
            .first();
          
          const user = await ctx.db.get(complaint.userId!);
          
          if (userProfile) {
            userName = `${userProfile.firstName} ${userProfile.lastName}`;
          }
          if (user?.email) {
            userEmail = user.email;
          }
        }

        // Get assigned user details
        let assignedUserName = null;
        if (complaint.assignedTo) {
          const assignedProfile = await ctx.db
            .query("userProfiles")
            .withIndex("by_user", (q) => q.eq("userId", complaint.assignedTo!))
            .first();
          if (assignedProfile) {
            assignedUserName = `${assignedProfile.firstName} ${assignedProfile.lastName}`;
          }
        }

        return {
          ...complaint,
          userEmail,
          userName,
          assignedUserName,
          isOverdue: complaint.dueDate ? Date.now() > complaint.dueDate : false,
        };
      })
    );

    return complaintsWithUsers;
  },
});

export const getComplaintById = query({
  args: { 
    complaintId: v.id("complaints"),
    anonymousEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const complaint = await ctx.db.get(args.complaintId);
    
    if (!complaint) {
      return null;
    }

    // Check access permissions
    let hasAccess = false;
    
    if (complaint.isAnonymous) {
      // For anonymous complaints, check email match
      hasAccess = args.anonymousEmail === complaint.anonymousEmail;
    } else if (userId) {
      // For registered users, check ownership or admin/moderator role
      const userProfile = await ctx.db
        .query("userProfiles")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();

      const isOwner = complaint.userId === userId;
      const isAdminOrModerator = userProfile && (userProfile.role === "ADMIN" || userProfile.role === "MODERATOR" || userProfile.role === "SUPER_ADMIN");
      
      hasAccess = Boolean(isOwner || isAdminOrModerator);
    }

    if (!hasAccess) {
      throw new Error("Access denied");
    }

    // Get complaint owner details
    let ownerName = "Anonymous User";
    let ownerEmail = complaint.anonymousEmail || "N/A";

    if (!complaint.isAnonymous && complaint.userId) {
      const ownerProfile = await ctx.db
        .query("userProfiles")
        .withIndex("by_user", (q) => q.eq("userId", complaint.userId!))
        .first();
      
      const owner = await ctx.db.get(complaint.userId!);

      if (ownerProfile) {
        ownerName = `${ownerProfile.firstName} ${ownerProfile.lastName}`;
      }
      if (owner?.email) {
        ownerEmail = owner.email;
      }
    }

    // Get assigned user details
    let assignedUserName = null;
    if (complaint.assignedTo) {
      const assignedProfile = await ctx.db
        .query("userProfiles")
        .withIndex("by_user", (q) => q.eq("userId", complaint.assignedTo!))
        .first();
      if (assignedProfile) {
        assignedUserName = `${assignedProfile.firstName} ${assignedProfile.lastName}`;
      }
    }

    return {
      ...complaint,
      ownerEmail,
      ownerName,
      assignedUserName,
      isOverdue: complaint.dueDate ? Date.now() > complaint.dueDate : false,
    };
  },
});

export const updateComplaintStatus = mutation({
  args: {
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
    notes: v.optional(v.string()),
    resolution: v.optional(v.string()),
    dueDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in");
    }

    // Check if user is admin/moderator
    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!userProfile || userProfile.role === "USER") {
      throw new Error("Insufficient permissions");
    }

    const complaint = await ctx.db.get(args.complaintId);
    if (!complaint) {
      throw new Error("Complaint not found");
    }

    const previousStatus = complaint.status;

    // Update complaint
    const updateData: any = {
      status: args.status,
    };

    if (args.resolution) {
      updateData.resolution = args.resolution;
    }

    if (args.dueDate) {
      updateData.dueDate = args.dueDate;
    }

    if (args.status === "RESOLVED" || args.status === "CLOSED") {
      updateData.resolvedAt = Date.now();
    }

    if (args.status === "ESCALATED" && !complaint.escalatedAt) {
      updateData.escalatedAt = Date.now();
    }

    await ctx.db.patch(args.complaintId, updateData);

    // Create status history entry
    await ctx.db.insert("statusHistory", {
      complaintId: args.complaintId,
      status: args.status,
      changedBy: userId,
      changedByName: `${userProfile.firstName} ${userProfile.lastName}`,
      notes: args.notes || `Status changed from ${previousStatus} to ${args.status}`,
      timestamp: Date.now(),
      previousStatus,
    });

    // Create audit log entry
    await ctx.db.insert("auditLog", {
      userId,
      action: "UPDATE_COMPLAINT_STATUS",
      entityType: "complaints",
      entityId: args.complaintId,
      oldValues: { status: previousStatus },
      newValues: { status: args.status },
      timestamp: Date.now(),
    });

    return args.complaintId;
  },
});

export const escalateComplaint = mutation({
  args: {
    complaintId: v.id("complaints"),
    reason: v.string(),
    escalateTo: v.optional(v.id("users")),
    newPriority: v.optional(v.union(
      v.literal("HIGH"),
      v.literal("CRITICAL")
    )),
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

    const complaint = await ctx.db.get(args.complaintId);
    if (!complaint) {
      throw new Error("Complaint not found");
    }

    const updateData: any = {
      status: "ESCALATED" as const,
      escalatedAt: Date.now(),
      escalationReason: args.reason,
    };

    if (args.escalateTo) {
      updateData.assignedTo = args.escalateTo;
    }

    if (args.newPriority) {
      updateData.priority = args.newPriority;
    }

    await ctx.db.patch(args.complaintId, updateData);

    // Create status history entry
    await ctx.db.insert("statusHistory", {
      complaintId: args.complaintId,
      status: "ESCALATED",
      changedBy: userId,
      changedByName: `${userProfile.firstName} ${userProfile.lastName}`,
      notes: `Complaint escalated: ${args.reason}`,
      timestamp: Date.now(),
      previousStatus: complaint.status,
    });

    // Create escalation note
    await ctx.db.insert("internalNotes", {
      complaintId: args.complaintId,
      note: `Complaint escalated by ${userProfile.firstName} ${userProfile.lastName}. Reason: ${args.reason}`,
      createdBy: userId,
      isPublic: false,
      noteType: "ESCALATION",
    });

    return args.complaintId;
  },
});

export const assignComplaint = mutation({
  args: {
    complaintId: v.id("complaints"),
    assignedTo: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in");
    }

    // Check if user is admin/moderator
    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!userProfile || userProfile.role === "USER") {
      throw new Error("Insufficient permissions");
    }

    const complaint = await ctx.db.get(args.complaintId);
    if (!complaint) {
      throw new Error("Complaint not found");
    }

    // Get assigned user details
    const assignedUserProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.assignedTo))
      .first();

    if (!assignedUserProfile) {
      throw new Error("Assigned user not found");
    }

    await ctx.db.patch(args.complaintId, {
      assignedTo: args.assignedTo,
      status: complaint.status === "SUBMITTED" ? "IN_PROGRESS" : complaint.status,
    });

    // Create status history entry
    await ctx.db.insert("statusHistory", {
      complaintId: args.complaintId,
      status: complaint.status === "SUBMITTED" ? "IN_PROGRESS" : complaint.status,
      changedBy: userId,
      changedByName: `${userProfile.firstName} ${userProfile.lastName}`,
      notes: `Complaint assigned to ${assignedUserProfile.firstName} ${assignedUserProfile.lastName}`,
      timestamp: Date.now(),
    });

    return args.complaintId;
  },
});

export const getComplaintHistory = query({
  args: { 
    complaintId: v.id("complaints"),
    anonymousEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const complaint = await ctx.db.get(args.complaintId);
    
    if (!complaint) {
      return [];
    }

    // Check access permissions (same logic as getComplaintById)
    let hasAccess = false;
    
    if (complaint.isAnonymous) {
      hasAccess = args.anonymousEmail === complaint.anonymousEmail;
    } else if (userId) {
      const userProfile = await ctx.db
        .query("userProfiles")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();

      const isOwner = complaint.userId === userId;
      const isAdminOrModerator = userProfile && (userProfile.role === "ADMIN" || userProfile.role === "MODERATOR" || userProfile.role === "SUPER_ADMIN");
      
      hasAccess = Boolean(isOwner || isAdminOrModerator);
    }

    if (!hasAccess) {
      throw new Error("Access denied");
    }

    const history = await ctx.db
      .query("statusHistory")
      .withIndex("by_complaint", (q) => q.eq("complaintId", args.complaintId))
      .order("desc")
      .collect();

    return history;
  },
});

export const addInternalNote = mutation({
  args: {
    complaintId: v.id("complaints"),
    note: v.string(),
    isPublic: v.boolean(),
    noteType: v.optional(v.union(
      v.literal("GENERAL"),
      v.literal("ESCALATION"),
      v.literal("RESOLUTION"),
      v.literal("FOLLOW_UP"),
      v.literal("SYSTEM")
    )),
    attachments: v.optional(v.array(v.id("_storage"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in");
    }

    // Check if user is admin/moderator
    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!userProfile || userProfile.role === "USER") {
      throw new Error("Insufficient permissions");
    }

    const complaint = await ctx.db.get(args.complaintId);
    if (!complaint) {
      throw new Error("Complaint not found");
    }

    const noteId = await ctx.db.insert("internalNotes", {
      complaintId: args.complaintId,
      note: args.note,
      createdBy: userId,
      isPublic: args.isPublic,
      noteType: args.noteType || "GENERAL",
      attachments: args.attachments,
    });

    return noteId;
  },
});

export const getComplaintNotes = query({
  args: { 
    complaintId: v.id("complaints"),
    publicOnly: v.optional(v.boolean()),
    anonymousEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const complaint = await ctx.db.get(args.complaintId);
    
    if (!complaint) {
      return [];
    }

    // Check access permissions
    let hasAccess = false;
    let isStaff = false;
    
    if (complaint.isAnonymous) {
      hasAccess = args.anonymousEmail === complaint.anonymousEmail;
    } else if (userId) {
      const userProfile = await ctx.db
        .query("userProfiles")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();

      const isOwner = complaint.userId === userId;
      isStaff = Boolean(userProfile && (userProfile.role === "ADMIN" || userProfile.role === "MODERATOR" || userProfile.role === "SUPER_ADMIN"));
      
      hasAccess = isOwner || isStaff;
    }

    if (!hasAccess) {
      throw new Error("Access denied");
    }

    let notes = await ctx.db
      .query("internalNotes")
      .withIndex("by_complaint", (q) => q.eq("complaintId", args.complaintId))
      .order("desc")
      .collect();

    // Filter to public notes only if user is not staff
    if (args.publicOnly || !isStaff) {
      notes = notes.filter(note => note.isPublic);
    }

    // Get user details for each note
    const notesWithUsers = await Promise.all(
      notes.map(async (note) => {
        const userProfile = await ctx.db
          .query("userProfiles")
          .withIndex("by_user", (q) => q.eq("userId", note.createdBy))
          .first();
        
        return {
          ...note,
          createdByName: userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : "Unknown User",
        };
      })
    );

    return notesWithUsers;
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const getFileUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});
