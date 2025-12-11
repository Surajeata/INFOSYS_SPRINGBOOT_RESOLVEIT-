import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const createUserProfile = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    phoneNumber: v.optional(v.string()),
    role: v.optional(v.union(v.literal("USER"), v.literal("ADMIN"), v.literal("MODERATOR"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in");
    }

    
    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existingProfile) {
      throw new Error("Profile already exists");
    }

    const profileId = await ctx.db.insert("userProfiles", {
      userId,
      firstName: args.firstName,
      lastName: args.lastName,
      phoneNumber: args.phoneNumber,
      role: args.role || "USER",
    });

    return profileId;
  },
});


export const promoteToAdmin = mutation({
  args: {
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new Error("Must be logged in");
    }

    
    const currentUserProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", currentUserId))
      .first();

    
    const existingAdmins = await ctx.db.query("userProfiles").collect();
    const hasAdmins = existingAdmins.some(profile => profile.role === "ADMIN");

    if (hasAdmins && (!currentUserProfile || currentUserProfile.role !== "ADMIN")) {
      throw new Error("Only admins can promote users");
    }

    
    const allUsers = await ctx.db.query("users").collect();
    const targetUser = allUsers.find(user => user.email === args.userEmail);
    
    if (!targetUser) {
      throw new Error("User not found");
    }

    
    const targetProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", targetUser._id))
      .first();

    if (!targetProfile) {
      throw new Error("User profile not found");
    }


    await ctx.db.patch(targetProfile._id, {
      role: "ADMIN",
    });

    return targetProfile._id;
  },
});

export const getUserProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile) {
      return null;
    }

    const user = await ctx.db.get(userId);
    
    return {
      ...profile,
      email: user?.email,
    };
  },
});

export const updateUserProfile = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    phoneNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in");
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    await ctx.db.patch(profile._id, {
      firstName: args.firstName,
      lastName: args.lastName,
      phoneNumber: args.phoneNumber,
    });

    return profile._id;
  },
});

export const getAllStaff = query({
  args: {},
  handler: async (ctx) => {
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

    const allProfiles = await ctx.db.query("userProfiles").collect();
    const staffProfiles = allProfiles.filter(profile => 
      profile.role === "ADMIN" || profile.role === "MODERATOR"
    );

    const staffWithUsers = await Promise.all(
      staffProfiles.map(async (profile) => {
        const user = await ctx.db.get(profile.userId);
        return {
          ...profile,
          email: user?.email,
        };
      })
    );

    return staffWithUsers;
  },
});
