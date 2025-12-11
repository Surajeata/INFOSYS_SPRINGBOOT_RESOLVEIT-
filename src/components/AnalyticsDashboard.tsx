import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export function AnalyticsDashboard() {
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });
  const [exportFilters, setExportFilters] = useState({
    status: "",
    category: "",
    priority: "",
  });

  const stats = useQuery(api.analytics.getDashboardStats, {
    dateFrom: new Date(dateRange.from).getTime(),
    dateTo: new Date(dateRange.to).getTime() + 24 * 60 * 60 * 1000 - 1,
  });

  const timeSeriesData = useQuery(api.analytics.getTimeSeriesData, {
    dateFrom: new Date(dateRange.from).getTime(),
    dateTo: new Date(dateRange.to).getTime() + 24 * 60 * 60 * 1000 - 1,
    groupBy: "day",
  });

  const csvData = useQuery(api.analytics.exportComplaintsCSV, {
    dateFrom: new Date(dateRange.from).getTime(),
    dateTo: new Date(dateRange.to).getTime() + 24 * 60 * 60 * 1000 - 1,
    status: exportFilters.status || undefined,
    category: exportFilters.category || undefined,
    priority: exportFilters.priority || undefined,
  });

  const downloadCSV = () => {
    if (!csvData || csvData.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = Object.keys(csvData[0]);
    const csvContent = [
      headers.join(","),
      ...csvData.map(row => 
        headers.map(header => {
          const value = row[header as keyof typeof row];
          // Escape commas and quotes in CSV
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `complaints_export_${dateRange.from}_to_${dateRange.to}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("CSV exported successfully");
  };

  const formatDuration = (milliseconds: number) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h`;
  };

  if (!stats) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
        
        {/* Date Range Selector */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">From:</label>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">To:</label>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">📋</span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-600">Total</p>
              <p className="text-2xl font-bold text-blue-900">{stats.totalComplaints}</p>
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
              <p className="text-2xl font-bold text-yellow-900">{stats.pendingComplaints}</p>
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
              <p className="text-2xl font-bold text-green-900">{stats.resolvedComplaints}</p>
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
              <p className="text-sm font-medium text-red-600">Escalated</p>
              <p className="text-2xl font-bold text-red-900">{stats.escalatedComplaints}</p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">⚠️</span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-purple-600">Overdue</p>
              <p className="text-2xl font-bold text-purple-900">{stats.overdueComplaints}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Resolution Rate</h3>
          <div className="text-center">
            <div className="text-4xl font-bold text-green-600 mb-2">
              {stats.resolutionRate.toFixed(1)}%
            </div>
            <p className="text-sm text-gray-600">
              {stats.resolvedComplaints} of {stats.totalComplaints} resolved
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Avg Resolution Time</h3>
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">
              {formatDuration(stats.averageResolutionTime)}
            </div>
            <p className="text-sm text-gray-600">
              Average time to resolve
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Staff Performance</h3>
          <div className="space-y-2">
            {stats.staffWorkload.slice(0, 3).map((staff, index) => (
              <div key={staff.staffId} className="flex justify-between items-center">
                <span className="text-sm text-gray-700">{staff.name}</span>
                <span className="text-sm font-medium text-gray-900">
                  {staff.resolutionRate.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Breakdown</h3>
          <div className="space-y-3">
            {Object.entries(stats.categoryBreakdown)
              .filter(([_, count]) => count > 0)
              .sort(([_, a], [__, b]) => b - a)
              .map(([category, count]) => (
                <div key={category} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {category.replace("_", " ")}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-gray-900">{count}</span>
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ 
                          width: `${stats.totalComplaints > 0 ? (count / stats.totalComplaints) * 100 : 0}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Priority Distribution</h3>
          <div className="space-y-3">
            {Object.entries(stats.priorityBreakdown).map(([priority, count]) => (
              <div key={priority} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{priority}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-bold text-gray-900">{count}</span>
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        priority === "CRITICAL" ? "bg-red-500" :
                        priority === "HIGH" ? "bg-orange-500" :
                        priority === "MEDIUM" ? "bg-yellow-500" :
                        "bg-green-500"
                      }`}
                      style={{ 
                        width: `${stats.totalComplaints > 0 ? (count / stats.totalComplaints) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Time Series Chart */}
      {timeSeriesData && timeSeriesData.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Complaints Over Time</h3>
          <div className="space-y-4">
            {timeSeriesData.map((data, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="text-sm font-medium text-gray-700">
                  {new Date(data.date).toLocaleDateString()}
                </span>
                <div className="flex items-center space-x-4 text-sm">
                  <span className="text-blue-600">📝 {data.submitted}</span>
                  <span className="text-green-600">✅ {data.resolved}</span>
                  <span className="text-red-600">🚨 {data.escalated}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export Section */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Data</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status Filter</label>
            <select
              value={exportFilters.status}
              onChange={(e) => setExportFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
              <option value="ESCALATED">Escalated</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category Filter</label>
            <select
              value={exportFilters.category}
              onChange={(e) => setExportFilters(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              <option value="TECHNICAL">Technical</option>
              <option value="BILLING">Billing</option>
              <option value="SERVICE">Service</option>
              <option value="HARASSMENT">Harassment</option>
              <option value="DISCRIMINATION">Discrimination</option>
              <option value="SAFETY">Safety</option>
              <option value="POLICY_VIOLATION">Policy Violation</option>
              <option value="URGENT">Urgent</option>
              <option value="GENERAL">General</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority Filter</label>
            <select
              value={exportFilters.priority}
              onChange={(e) => setExportFilters(prev => ({ ...prev, priority: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={downloadCSV}
              disabled={!csvData || csvData.length === 0}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
            >
              📊 Export CSV ({csvData?.length || 0} records)
            </button>
          </div>
        </div>

        <p className="text-sm text-gray-600">
          Export complaints data as CSV for further analysis. The export includes all complaint details, 
          timestamps, resolution information, and user data (anonymized for anonymous complaints).
        </p>
      </div>
    </div>
  );
}
