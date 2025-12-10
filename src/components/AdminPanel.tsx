import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ComplaintList } from "./ComplaintList";
import { Id } from "../../convex/_generated/dataModel";

interface AdminPanelProps {
  complaints: any[];
  onViewComplaint: (complaintId: Id<"complaints">) => void;
  userProfile: {
    role: "USER" | "ADMIN" | "MODERATOR";
  };
}

export function AdminPanel({ complaints, onViewComplaint, userProfile }: AdminPanelProps) {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  const filteredComplaints = complaints.filter(complaint => {
    const statusMatch = statusFilter === "ALL" || complaint.status === statusFilter;
    const categoryMatch = categoryFilter === "ALL" || complaint.category === categoryFilter;
    return statusMatch && categoryMatch;
  });

  const getStatusCounts = () => {
    const counts = {
      SUBMITTED: 0,
      IN_PROGRESS: 0,
      UNDER_REVIEW: 0,
      RESOLVED: 0,
      CLOSED: 0,
      ESCALATED: 0,
    };
    
    complaints.forEach(complaint => {
      if (counts.hasOwnProperty(complaint.status)) {
        counts[complaint.status as keyof typeof counts]++;
      }
    });
    
    return counts;
  };

  const statusCounts = getStatusCounts();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Admin Dashboard</h2>
        
        {/* Status Overview */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {Object.entries(statusCounts).map(([status, count]) => (
            <div key={status} className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-gray-900">{count}</div>
              <div className="text-sm text-gray-600">{status.replace("_", " ")}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div>
            <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Status
            </label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              Filter by Category
            </label>
            <select
              id="categoryFilter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Categories</option>
              <option value="TECHNICAL">Technical</option>
              <option value="BILLING">Billing</option>
              <option value="SERVICE">Service</option>
              <option value="GENERAL">General</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
        </div>
      </div>

      <ComplaintList
        complaints={filteredComplaints}
        onViewComplaint={onViewComplaint}
        title={`All Complaints (${filteredComplaints.length})`}
        emptyMessage="No complaints match the current filters."
      />
    </div>
  );
}
