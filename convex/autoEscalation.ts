import { mutation, action, internalMutation, internalQuery, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const checkAutoEscalation = internalAction({
  args: {},
  handler: async (ctx): Promise<{ processed: number; escalated: number; timestamp: number }> => {
    const now = Date.now();
    
  
    const complaints: any[] = await ctx.runQuery(internal.autoEscalation.getComplaintsForEscalation, {});
    
    let escalatedCount = 0;
    
    for (const complaint of complaints) {
      let shouldEscalate = false;
      let escalationReason = "";
      let newPriority = complaint.priority;
      
     
      if (complaint.dueDate && now > complaint.dueDate) {
        const hoursOverdue = Math.floor((now - complaint.dueDate) / (1000 * 60 * 60));
        
        if (hoursOverdue >= 12) { // 12 hours overdue
          shouldEscalate = true;
          escalationReason = `Complaint is ${hoursOverdue} hours overdue`;
          newPriority = complaint.priority === "LOW" ? "MEDIUM" : 
                       complaint.priority === "MEDIUM" ? "HIGH" : "CRITICAL";
        }
      }
      
     
      const ageInHours = Math.floor((now - complaint._creationTime) / (1000 * 60 * 60));
      
      if (complaint.priority === "CRITICAL" && ageInHours >= 2) {
        shouldEscalate = true;
        escalationReason = `Critical complaint unresolved for ${ageInHours} hours (SLA: 2 hours)`;
      } else if (complaint.priority === "HIGH" && ageInHours >= 8) {
        shouldEscalate = true;
        escalationReason = `High priority complaint unresolved for ${ageInHours} hours (SLA: 8 hours)`;
        newPriority = "CRITICAL";
      } else if (complaint.priority === "MEDIUM" && ageInHours >= 24) {
        shouldEscalate = true;
        escalationReason = `Medium priority complaint unresolved for ${ageInHours} hours (SLA: 24 hours)`;
        newPriority = "HIGH";
      } else if (complaint.priority === "LOW" && ageInHours >= 72) {
        shouldEscalate = true;
        escalationReason = `Low priority complaint unresolved for ${ageInHours} hours (SLA: 72 hours)`;
        newPriority = "MEDIUM";
      }
      
      
      if (["HARASSMENT", "DISCRIMINATION", "SAFETY"].includes(complaint.category)) {
        if (ageInHours >= 4) {
          shouldEscalate = true;
          escalationReason = `Sensitive complaint (${complaint.category}) unresolved for ${ageInHours} hours (SLA: 4 hours)`;
          newPriority = "CRITICAL";
        }
      }
      
      
      if (complaint.urgencyLevel && complaint.urgencyLevel >= 8 && ageInHours >= 6) {
        shouldEscalate = true;
        escalationReason = `High urgency complaint (level ${complaint.urgencyLevel}) unresolved for ${ageInHours} hours`;
        newPriority = "CRITICAL";
      }
      
     
      const statusHistory = await ctx.runQuery(internal.autoEscalation.getComplaintStatusHistory, {
        complaintId: complaint._id
      });
      
      if (statusHistory.length >= 5 && ageInHours >= 48) {
        shouldEscalate = true;
        escalationReason = `Complex complaint with ${statusHistory.length} status changes over ${ageInHours} hours`;
        newPriority = complaint.priority === "LOW" ? "HIGH" : "CRITICAL";
      }
      
      if (shouldEscalate) {
        await ctx.runMutation(internal.autoEscalation.performAutoEscalation, {
          complaintId: complaint._id,
          reason: escalationReason,
          newPriority,
        });
        escalatedCount++;
      }
    }
    
    return { 
      processed: complaints.length, 
      escalated: escalatedCount,
      timestamp: now 
    };
  },
});

export const getComplaintsForEscalation = internalQuery({
  args: {},
  handler: async (ctx) => {
    
    const complaints = await ctx.db
      .query("complaints")
      .filter((q) => 
        q.and(
          q.neq(q.field("status"), "RESOLVED"),
          q.neq(q.field("status"), "CLOSED")
        )
      )
      .collect();
    
    const fourHoursAgo = Date.now() - (4 * 60 * 60 * 1000);
    return complaints.filter(complaint => 
      !complaint.escalatedAt || complaint.escalatedAt < fourHoursAgo
    );
  },
});

export const getComplaintStatusHistory = internalQuery({
  args: {
    complaintId: v.id("complaints"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("statusHistory")
      .withIndex("by_complaint", (q) => q.eq("complaintId", args.complaintId))
      .collect();
  },
});

export const performAutoEscalation = internalMutation({
  args: {
    complaintId: v.id("complaints"),
    reason: v.string(),
    newPriority: v.optional(v.union(
      v.literal("LOW"),
      v.literal("MEDIUM"),
      v.literal("HIGH"),
      v.literal("CRITICAL")
    )),
  },
  handler: async (ctx, args) => {
    const complaint = await ctx.db.get(args.complaintId);
    if (!complaint) return;
    
    
    const escalationRules = await ctx.db
      .query("escalationRules")
      .withIndex("by_category_priority", (q) => 
        q.eq("category", complaint.category).eq("priority", args.newPriority || complaint.priority)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();
    
    let escalateTo = escalationRules?.escalateTo;
    
    
    if (!escalateTo) {
      const staff = await ctx.db
        .query("userProfiles")
        .filter((q) => 
          q.and(
            q.or(
              q.eq(q.field("role"), "ADMIN"),
              q.eq(q.field("role"), "MODERATOR"),
              q.eq(q.field("role"), "SUPER_ADMIN")
            ),
            q.eq(q.field("isActive"), true)
          )
        )
        .collect();
      
      if (staff.length > 0) {
      
        const staffWorkload = await Promise.all(
          staff.map(async (member) => {
            const activeComplaints = await ctx.db
              .query("complaints")
              .withIndex("by_assigned", (q) => q.eq("assignedTo", member.userId))
              .filter((q) => 
                q.and(
                  q.neq(q.field("status"), "RESOLVED"),
                  q.neq(q.field("status"), "CLOSED")
                )
              )
              .collect();
            
            return {
              userId: member.userId,
              workload: activeComplaints.length,
              role: member.role
            };
          })
        );
        
        
        staffWorkload.sort((a, b) => {
          if (a.workload !== b.workload) return a.workload - b.workload;
          
          const roleOrder = { "SUPER_ADMIN": 0, "ADMIN": 1, "MODERATOR": 2 };
          return roleOrder[a.role as keyof typeof roleOrder] - roleOrder[b.role as keyof typeof roleOrder];
        });
        
        escalateTo = staffWorkload[0]?.userId;
      }
    }
    
    const previousStatus = complaint.status;
    const newPriority = args.newPriority || complaint.priority;
    
   
    await ctx.db.patch(args.complaintId, {
      status: "ESCALATED",
      escalatedAt: Date.now(),
      escalationReason: `AUTO-ESCALATED: ${args.reason}`,
      assignedTo: escalateTo,
      priority: newPriority,
    });
    
   
    await ctx.db.insert("statusHistory", {
      complaintId: args.complaintId,
      status: "ESCALATED",
      changedByName: "System (Auto-Escalation)",
      notes: `AUTO-ESCALATED: ${args.reason}. Priority changed from ${complaint.priority} to ${newPriority}.`,
      timestamp: Date.now(),
      isSystemGenerated: true,
      previousStatus,
    });
    
  
    if (complaint.userId && !complaint.isAnonymous) {
      await ctx.db.insert("notifications", {
        userId: complaint.userId,
        complaintId: args.complaintId,
        title: "🚨 Complaint Auto-Escalated",
        message: `Your complaint "${complaint.title}" has been automatically escalated for faster resolution. Reason: ${args.reason}`,
        type: "AUTO_ESCALATED",
        isRead: false,
      });
    }
    
    
    if (escalateTo) {
      await ctx.db.insert("notifications", {
        userId: escalateTo,
        complaintId: args.complaintId,
        title: "⚡ Urgent: Complaint Auto-Escalated",
        message: `Complaint "${complaint.title}" has been auto-escalated and assigned to you. Priority: ${newPriority}. Reason: ${args.reason}`,
        type: "AUTO_ESCALATED",
        isRead: false,
      });
    }
    
    
    await ctx.scheduler.runAfter(0, internal.autoEscalation.sendEscalationEmails, {
      complaintId: args.complaintId,
      reason: args.reason,
      newPriority,
    });
  },
});

export const sendEscalationEmails = internalAction({
  args: {
    complaintId: v.id("complaints"),
    reason: v.string(),
    newPriority: v.string(),
  },
  handler: async (ctx, args) => {
    const complaint = await ctx.runQuery(internal.autoEscalation.getComplaintForEmail, {
      complaintId: args.complaintId,
    });
    
    if (!complaint) return;
    
    if (complaint.ownerEmail) {
      await ctx.runAction(internal.emailActions.sendEmailNotification, {
        to: complaint.ownerEmail,
        subject: `🚨 Complaint Escalated - ${complaint.title}`,
        message: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 15px;">
            <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
              <h2 style="color: #2d3748; margin-bottom: 20px; font-size: 24px;">🚨 Your Complaint Has Been Escalated</h2>
              
              <div style="background: #fed7d7; border-left: 4px solid #e53e3e; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <p style="margin: 0; color: #742a2a; font-weight: 600;">Priority Escalation Notice</p>
              </div>
              
              <p style="color: #4a5568; line-height: 1.6; margin-bottom: 15px;">
                Your complaint has been automatically escalated to ensure faster resolution and priority handling.
              </p>
              
              <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0; color: #2d3748;"><strong>Complaint:</strong> ${complaint.title}</p>
                <p style="margin: 5px 0; color: #2d3748;"><strong>New Priority:</strong> <span style="color: #e53e3e; font-weight: bold;">${args.newPriority}</span></p>
                <p style="margin: 5px 0; color: #2d3748;"><strong>Reason:</strong> ${args.reason}</p>
                <p style="margin: 5px 0; color: #2d3748;"><strong>Status:</strong> Escalated</p>
              </div>
              
              <div style="background: linear-gradient(135deg, #4299e1, #3182ce); color: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; font-weight: 600;">✅ What happens next?</p>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>Your complaint is now high priority</li>
                  <li>Assigned to senior staff for immediate attention</li>
                  <li>You'll receive updates within 2-4 hours</li>
                  <li>Resolution timeline has been accelerated</li>
                </ul>
              </div>
              
              <p style="color: #718096; font-size: 14px; margin-top: 30px; text-align: center;">
                Thank you for your patience. We're committed to resolving your concern quickly.
              </p>
            </div>
          </div>
        `,
        complaintId: args.complaintId,
      });
    }
    
    
    if (complaint.assignedEmail) {
      await ctx.runAction(internal.emailActions.sendEmailNotification, {
        to: complaint.assignedEmail,
        subject: `⚡ URGENT: Auto-Escalated Complaint - ${complaint.title}`,
        message: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #e53e3e 0%, #c53030 100%); padding: 20px; border-radius: 15px;">
            <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
              <h2 style="color: #c53030; margin-bottom: 20px; font-size: 24px;">⚡ URGENT: Auto-Escalated Complaint</h2>
              
              <div style="background: #fed7d7; border: 2px solid #e53e3e; padding: 15px; margin: 20px 0; border-radius: 8px;">
                <p style="margin: 0; color: #742a2a; font-weight: bold; font-size: 16px;">🚨 Immediate Action Required</p>
              </div>
              
              <p style="color: #4a5568; line-height: 1.6; margin-bottom: 15px;">
                A complaint has been automatically escalated and assigned to you based on SLA violations or priority rules.
              </p>
              
              <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #e53e3e;">
                <p style="margin: 5px 0; color: #2d3748;"><strong>Complaint:</strong> ${complaint.title}</p>
                <p style="margin: 5px 0; color: #2d3748;"><strong>Priority:</strong> <span style="color: #e53e3e; font-weight: bold;">${args.newPriority}</span></p>
                <p style="margin: 5px 0; color: #2d3748;"><strong>Category:</strong> ${complaint.category}</p>
                <p style="margin: 5px 0; color: #2d3748;"><strong>Escalation Reason:</strong> ${args.reason}</p>
              </div>
              
              <div style="background: linear-gradient(135deg, #e53e3e, #c53030); color: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; font-weight: 600;">⏰ Required Actions:</p>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>Review complaint immediately</li>
                  <li>Acknowledge receipt within 1 hour</li>
                  <li>Provide initial response within 2 hours</li>
                  <li>Escalate further if needed</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="#" style="background: linear-gradient(135deg, #4299e1, #3182ce); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: 600; display: inline-block;">
                  View Complaint Details
                </a>
              </div>
              
              <p style="color: #718096; font-size: 14px; margin-top: 30px; text-align: center;">
                This is an automated escalation. Please take immediate action to maintain service quality.
              </p>
            </div>
          </div>
        `,
        complaintId: args.complaintId,
      });
    }
  },
});

export const getComplaintForEmail = internalQuery({
  args: {
    complaintId: v.id("complaints"),
  },
  handler: async (ctx, args) => {
    const complaint = await ctx.db.get(args.complaintId);
    if (!complaint) return null;
    
    let ownerEmail = complaint.anonymousEmail;
    let assignedEmail = null;
    
    if (!complaint.isAnonymous && complaint.userId) {
      const owner = await ctx.db.get(complaint.userId);
      ownerEmail = owner?.email;
    }
    
    if (complaint.assignedTo) {
      const assigned = await ctx.db.get(complaint.assignedTo);
      assignedEmail = assigned?.email;
    }
    
    return {
      ...complaint,
      ownerEmail,
      assignedEmail,
    };
  },
});


export const manualEscalation = mutation({
  args: {
    complaintId: v.id("complaints"),
    reason: v.string(),
    escalateTo: v.optional(v.id("users")),
    newPriority: v.optional(v.union(
      v.literal("LOW"),
      v.literal("MEDIUM"),
      v.literal("HIGH"),
      v.literal("CRITICAL")
    )),
  },
  handler: async (ctx, args) => {
    
    const complaint = await ctx.db.get(args.complaintId);
    if (!complaint) throw new Error("Complaint not found");
    
    await ctx.runMutation(internal.autoEscalation.performAutoEscalation, {
      complaintId: args.complaintId,
      reason: `MANUAL ESCALATION: ${args.reason}`,
      newPriority: args.newPriority,
    });
    
    return { success: true };
  },
});
