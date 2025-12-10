interface AdminStatsProps {
  statusCounts: Record<string, number>;
  priorityCounts: Record<string, number>;
  totalComplaints: number;
  totalStaff: number;
}

export function AdminStats({ statusCounts, priorityCounts, totalComplaints, totalStaff }: AdminStatsProps) {
  const pendingComplaints = statusCounts.SUBMITTED + statusCounts.IN_PROGRESS + statusCounts.UNDER_REVIEW;
  const resolvedComplaints = statusCounts.RESOLVED + statusCounts.CLOSED;
  const criticalComplaints = priorityCounts.CRITICAL + priorityCounts.HIGH;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">📋</span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-600">Total Complaints</p>
              <p className="text-2xl font-bold text-blue-900">{totalComplaints}</p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">⏳</span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-yellow-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-900">{pendingComplaints}</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">✅</span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-600">Resolved</p>
              <p className="text-2xl font-bold text-green-900">{resolvedComplaints}</p>
            </div>
          </div>
        </div>

        <div className="bg-red-50 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">🚨</span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-600">High Priority</p>
              <p className="text-2xl font-bold text-red-900">{criticalComplaints}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Status Breakdown</h4>
          <div className="space-y-3">
            {Object.entries(statusCounts).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">
                  {status.replace("_", " ")}
                </span>
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-bold text-gray-900">{count}</span>
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${totalComplaints > 0 ? (count / totalComplaints) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Priority Distribution</h4>
          <div className="space-y-3">
            {Object.entries(priorityCounts).map(([priority, count]) => (
              <div key={priority} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">{priority}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-bold text-gray-900">{count}</span>
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        priority === "CRITICAL" ? "bg-red-500" :
                        priority === "HIGH" ? "bg-orange-500" :
                        priority === "MEDIUM" ? "bg-yellow-500" :
                        "bg-green-500"
                      }`}
                      style={{ width: `${totalComplaints > 0 ? (count / totalComplaints) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Staff Overview */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-semibold text-gray-900">Staff Members</h4>
            <p className="text-sm text-gray-600">Active staff managing complaints</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">{totalStaff}</p>
            <p className="text-sm text-gray-600">Total Staff</p>
          </div>
        </div>
      </div>
    </div>
  );
}
