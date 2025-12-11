import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface StaffManagementProps {
  userProfile: {
    role: "USER" | "ADMIN" | "MODERATOR" | "SUPER_ADMIN";
  };
}

export function StaffManagement({ userProfile }: StaffManagementProps) {
  const staff = useQuery(api.users.getAllStaff);
  const allComplaints = useQuery(api.complaints.getAllComplaints, {});

  const getStaffWorkload = (staffId: Id<"users">) => {
    if (!allComplaints) return { total: 0, pending: 0, resolved: 0 };
    
    const assigned = allComplaints.filter(complaint => complaint.assignedTo === staffId);
    const pending = assigned.filter(complaint => 
      ["SUBMITTED", "IN_PROGRESS", "UNDER_REVIEW"].includes(complaint.status)
    );
    const resolved = assigned.filter(complaint => 
      ["RESOLVED", "CLOSED"].includes(complaint.status)
    );
    
    return {
      total: assigned.length,
      pending: pending.length,
      resolved: resolved.length
    };
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-purple-100 text-purple-800";
      case "MODERATOR":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Staff Management</h2>
        {userProfile.role === "ADMIN" && (
          <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
            Add Staff Member
          </button>
        )}
      </div>

      {staff && staff.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">👥</div>
          <p className="text-gray-500 text-lg">No staff members found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {staff?.map((member) => {
            const workload = getStaffWorkload(member.userId);
            return (
              <div key={member._id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">
                      {member.firstName} {member.lastName}
                    </h3>
                    <p className="text-sm text-gray-600">{member.email}</p>
                    {member.phoneNumber && (
                      <p className="text-sm text-gray-600">{member.phoneNumber}</p>
                    )}
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(member.role)}`}>
                    {member.role}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Assigned:</span>
                    <span className="font-medium text-gray-900">{workload.total}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Pending:</span>
                    <span className="font-medium text-yellow-600">{workload.pending}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Resolved:</span>
                    <span className="font-medium text-green-600">{workload.resolved}</span>
                  </div>

                  {workload.total > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Resolution Rate</span>
                        <span>{Math.round((workload.resolved / workload.total) * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${(workload.resolved / workload.total) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    Member since {new Date(member._creationTime).toLocaleDateString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
