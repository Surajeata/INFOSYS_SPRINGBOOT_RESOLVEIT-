import { Id } from "../../convex/_generated/dataModel";

interface Complaint {
  _id: Id<"complaints">;
  title: string;
  description: string;
  category: "TECHNICAL" | "BILLING" | "SERVICE" | "GENERAL" | "URGENT" | "HARASSMENT" | "DISCRIMINATION" | "SAFETY" | "POLICY_VIOLATION" | "OTHER";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "SUBMITTED" | "IN_PROGRESS" | "UNDER_REVIEW" | "RESOLVED" | "CLOSED" | "ESCALATED" | "PENDING_INFO" | "REOPENED";
  userId?: Id<"users">;
  assignedTo?: Id<"users">;
  resolution?: string;
  resolvedAt?: number;
  _creationTime: number;
  userEmail?: string;
  userName?: string;
  isAnonymous?: boolean;
  anonymousEmail?: string;
  [key: string]: any; // Allow additional properties
}

interface ComplaintListProps {
  complaints: Complaint[];
  onViewComplaint: (complaintId: Id<"complaints">) => void;
  title: string;
  emptyMessage: string;
}

export function ComplaintList({ complaints, onViewComplaint, title, emptyMessage }: ComplaintListProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "SUBMITTED":
        return "bg-blue-100 text-blue-800";
      case "IN_PROGRESS":
        return "bg-yellow-100 text-yellow-800";
      case "UNDER_REVIEW":
        return "bg-purple-100 text-purple-800";
      case "RESOLVED":
        return "bg-green-100 text-green-800";
      case "CLOSED":
        return "bg-gray-100 text-gray-800";
      case "ESCALATED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "LOW":
        return "bg-green-100 text-green-800";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800";
      case "HIGH":
        return "bg-orange-100 text-orange-800";
      case "CRITICAL":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">{title}</h2>
      
      {complaints.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📋</div>
          <p className="text-gray-500 text-lg">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {complaints.map((complaint) => (
            <div
              key={complaint._id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onViewComplaint(complaint._id)}
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-medium text-gray-900 flex-1 mr-4">
                  {complaint.title}
                </h3>
                <div className="flex space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(complaint.status)}`}>
                    {complaint.status.replace("_", " ")}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(complaint.priority)}`}>
                    {complaint.priority}
                  </span>
                </div>
              </div>
              
              <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                {complaint.description}
              </p>
              
              <div className="flex justify-between items-center text-sm text-gray-500">
                <div className="flex space-x-4">
                  <span>Category: {complaint.category}</span>
                  {complaint.userName && (
                    <span>By: {complaint.userName}</span>
                  )}
                </div>
                <span>
                  {new Date(complaint._creationTime).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
