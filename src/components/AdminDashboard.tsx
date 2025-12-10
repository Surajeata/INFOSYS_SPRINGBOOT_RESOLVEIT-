import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ComplaintList } from "./ComplaintList";
import { ComplaintDetails } from "./ComplaintDetails";
import { StaffManagement } from "./StaffManagement";
import { AdminStats } from "./AdminStats";
import { Id } from "../../convex/_generated/dataModel";

interface AdminDashboardProps {
  userProfile: {
    _id: Id<"userProfiles">;
    userId: Id<"users">;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    role: "USER" | "ADMIN" | "MODERATOR" | "SUPER_ADMIN";
    email?: string;
  };
}

export function AdminDashboard({ userProfile }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "complaints" | "staff" | "details">("overview");
  const [selectedComplaintId, setSelectedComplaintId] = useState<Id<"complaints"> | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");

  const allComplaints = useQuery(api.complaints.getAllComplaints, {});
  const staff = useQuery(api.users.getAllStaff);

  const handleViewComplaint = (complaintId: Id<"complaints">) => {
    setSelectedComplaintId(complaintId);
    setActiveTab("details");
  };

  const handleBackToComplaints = () => {
    setSelectedComplaintId(null);
    setActiveTab("complaints");
  };

  const filteredComplaints = allComplaints?.filter(complaint => {
    const statusMatch = statusFilter === "ALL" || complaint.status === statusFilter;
    const categoryMatch = categoryFilter === "ALL" || complaint.category === categoryFilter;
    const priorityMatch = priorityFilter === "ALL" || complaint.priority === priorityFilter;
    return statusMatch && categoryMatch && priorityMatch;
  }) || [];

  const getStatusCounts = () => {
    const counts = {
      SUBMITTED: 0,
      IN_PROGRESS: 0,
      UNDER_REVIEW: 0,
      RESOLVED: 0,
      CLOSED: 0,
      ESCALATED: 0,
    };
    
    allComplaints?.forEach(complaint => {
      if (counts.hasOwnProperty(complaint.status)) {
        counts[complaint.status as keyof typeof counts]++;
      }
    });
    
    return counts;
  };

  const getPriorityCounts = () => {
    const counts = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    allComplaints?.forEach(complaint => {
      if (counts.hasOwnProperty(complaint.priority)) {
        counts[complaint.priority as keyof typeof counts]++;
      }
    });
    return counts;
  };

  const statusCounts = getStatusCounts();
  const priorityCounts = getPriorityCounts();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Admin Dashboard
        </h1>
        <p className="text-gray-600 mt-1">
          Manage complaints, staff, and system operations
        </p>
      </div>

      {/* Navigation Tabs */}
      {activeTab !== "details" && (
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab("overview")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "overview"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Overview
              </button>
              
              <button
                onClick={() => setActiveTab("complaints")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "complaints"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Complaints ({allComplaints?.length || 0})
              </button>

              <button
                onClick={() => setActiveTab("staff")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "staff"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Staff Management ({staff?.length || 0})
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm">
        {activeTab === "overview" && (
          <div className="p-6">
            <AdminStats 
              statusCounts={statusCounts}
              priorityCounts={priorityCounts}
              totalComplaints={allComplaints?.length || 0}
              totalStaff={staff?.length || 0}
            />
            
            {/* Recent Activity */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Complaints</h3>
              <div className="space-y-3">
                {allComplaints?.slice(0, 5).map((complaint) => (
                  <div
                    key={complaint._id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleViewComplaint(complaint._id)}
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{complaint.title}</h4>
                      <p className="text-sm text-gray-600">By: {complaint.userName}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        complaint.status === "SUBMITTED" ? "bg-blue-100 text-blue-800" :
                        complaint.status === "IN_PROGRESS" ? "bg-yellow-100 text-yellow-800" :
                        complaint.status === "RESOLVED" ? "bg-green-100 text-green-800" :
                        "bg-gray-100 text-gray-800"
                      }`}>
                        {complaint.status.replace("_", " ")}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(complaint._creationTime).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "complaints" && (
          <div className="p-6">
            {/* Filters */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter Complaints</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    id="statusFilter"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="SUBMITTED">Submitted</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="UNDER_REVIEW">Under Review</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                    <option value="ESCALATED">Escalated</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="categoryFilter" className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    id="categoryFilter"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ALL">All Categories</option>
                    <option value="TECHNICAL">Technical</option>
                    <option value="BILLING">Billing</option>
                    <option value="SERVICE">Service</option>
                    <option value="GENERAL">General</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="priorityFilter" className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    id="priorityFilter"
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ALL">All Priorities</option>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>
            </div>

            <ComplaintList
              complaints={filteredComplaints}
              onViewComplaint={handleViewComplaint}
              title={`Complaints (${filteredComplaints.length})`}
              emptyMessage="No complaints match the current filters."
            />
          </div>
        )}

        {activeTab === "staff" && (
          <StaffManagement userProfile={userProfile} />
        )}

        {activeTab === "details" && selectedComplaintId && (
          <ComplaintDetails
            complaintId={selectedComplaintId}
            userProfile={userProfile}
            onBack={handleBackToComplaints}
          />
        )}
      </div>
    </div>
  );
}
