"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";

export const sendEmailNotification = internalAction({
  args: {
    to: v.string(),
    subject: v.string(),
    message: v.string(),
    complaintId: v.optional(v.id("complaints")),
  },
  handler: async (ctx, args) => {
    const resend = new Resend(process.env.CONVEX_RESEND_API_KEY);

    try {
      const { data, error } = await resend.emails.send({
        from: "ResolveIt Notifications <notifications@resolveit.app>",
        to: args.to,
        subject: args.subject,
        html: args.message,
      });

      if (error) {
        console.error("Failed to send email:", error);
        throw new Error(`Failed to send email: ${JSON.stringify(error)}`);
      }

      return data;
    } catch (error) {
      console.error("Email sending error:", error);
      throw error;
    }
  },
});
