import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface EscalationPanelProps {
  complaintId: Id<"complaints">;
  userProfile: {
    _id: Id<"userProfiles">;
    userId: Id<"users">;
    firstName: string;
    lastName: string;
    role: "USER" | "ADMIN" | "MODERATOR" | "SUPER_ADMIN";
  };
  onEscalated?: () => void;
}

export function EscalationPanel({ complaintId, userProfile, onEscalated }: EscalationPanelProps) {
  const [reason, setReason] = useState("");
  const [newPriority, setNewPriority] = useState<"HIGH" | "CRITICAL">("HIGH");
  const [escalateTo, setEscalateTo] = useState<Id<"users"> | "">("");
  const [isEscalating, setIsEscalating] = useState(false);

  const staff = useQuery(api.users.getAllStaff);
  const escalateComplaint = useMutation(api.complaints.escalateComplaint);

  const handleEscalate = async () => {
    if (!reason.trim()) {
      alert("Please provide a reason for escalation");
      return;
    }

    setIsEscalating(true);
    try {
      await escalateComplaint({
        complaintId,
        reason,
        newPriority,
        escalateTo: escalateTo || undefined,
      });
      
      setReason("");
      setEscalateTo("");
      onEscalated?.();
    } catch (error) {
      console.error("Failed to escalate complaint:", error);
      alert("Failed to escalate complaint. Please try again.");
    } finally {
      setIsEscalating(false);
    }
  };

  if (userProfile.role === "USER") {
    return null;
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-red-800 mb-4">🚨 Escalate Complaint</h3>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="escalationReason" className="block text-sm font-medium text-gray-700 mb-1">
            Escalation Reason *
          </label>
          <textarea
            id="escalationReason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why this complaint needs to be escalated..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            rows={3}
          />
        </div>

        <div>
          <label htmlFor="newPriority" className="block text-sm font-medium text-gray-700 mb-1">
            New Priority
          </label>
          <select
            id="newPriority"
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value as "HIGH" | "CRITICAL")}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>

        <div>
          <label htmlFor="escalateTo" className="block text-sm font-medium text-gray-700 mb-1">
            Escalate To (Optional)
          </label>
          <select
            id="escalateTo"
            value={escalateTo}
            onChange={(e) => setEscalateTo(e.target.value as Id<"users"> | "")}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="">Auto-assign to available staff</option>
            {staff?.filter(member => 
              member.role !== "USER" && member.userId !== userProfile.userId
            ).map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.firstName} {member.lastName} ({member.role})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleEscalate}
          disabled={isEscalating || !reason.trim()}
          className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {isEscalating ? "Escalating..." : "🚨 Escalate Complaint"}
        </button>
      </div>
    </div>
  );
}
