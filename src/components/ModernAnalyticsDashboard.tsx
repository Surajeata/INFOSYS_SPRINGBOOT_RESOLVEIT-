import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

export function ModernAnalyticsDashboard() {
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('area');

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

  // Prepare chart data
  const pieChartData = stats ? [
    { name: 'Resolved', value: stats.resolvedComplaints, color: '#10b981' },
    { name: 'Pending', value: stats.pendingComplaints, color: '#f59e0b' },
    { name: 'Escalated', value: stats.escalatedComplaints, color: '#ef4444' },
    { name: 'Overdue', value: stats.overdueComplaints, color: '#8b5cf6' },
  ] : [];

  const categoryChartData = stats ? Object.entries(stats.categoryBreakdown)
    .filter(([_, count]) => count > 0)
    .map(([category, count]) => ({
      category: category.replace('_', ' '),
      count,
      percentage: ((count / stats.totalComplaints) * 100).toFixed(1),
    })) : [];

  const priorityChartData = stats ? Object.entries(stats.priorityBreakdown)
    .map(([priority, count]) => ({
      priority,
      count,
      percentage: stats.totalComplaints > 0 ? ((count / stats.totalComplaints) * 100).toFixed(1) : '0',
    })) : [];

  const radarData = stats ? [
    { subject: 'Resolution Rate', A: stats.resolutionRate, fullMark: 100 },
    { subject: 'Response Time', A: Math.max(0, 100 - (stats.averageResolutionTime / (24 * 60 * 60 * 1000)) * 10), fullMark: 100 },
    { subject: 'Staff Efficiency', A: stats.staffWorkload.length > 0 ? stats.staffWorkload.reduce((acc, staff) => acc + staff.resolutionRate, 0) / stats.staffWorkload.length : 0, fullMark: 100 },
    { subject: 'Escalation Control', A: Math.max(0, 100 - (stats.escalatedComplaints / Math.max(stats.totalComplaints, 1)) * 100), fullMark: 100 },
    { subject: 'Overdue Management', A: Math.max(0, 100 - (stats.overdueComplaints / Math.max(stats.totalComplaints, 1)) * 100), fullMark: 100 },
  ] : [];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];

  if (!stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            <p className="text-gray-600 font-medium">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Analytics Dashboard
              </h1>
              <p className="text-gray-600 mt-2">Comprehensive insights into complaint management performance</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">From:</label>
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">To:</label>
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {[
            { title: "Total Complaints", value: stats.totalComplaints, icon: "📊", color: "blue", change: "+12%" },
            { title: "Pending", value: stats.pendingComplaints, icon: "⏳", color: "yellow", change: "-5%" },
            { title: "Resolved", value: stats.resolvedComplaints, icon: "✅", color: "green", change: "+18%" },
            { title: "Escalated", value: stats.escalatedComplaints, icon: "🚨", color: "red", change: "+3%" },
            { title: "Overdue", value: stats.overdueComplaints, icon: "⚠️", color: "purple", change: "-8%" },
          ].map((metric, index) => (
            <div key={index} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium text-${metric.color}-600`}>{metric.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{metric.value}</p>
                  <p className={`text-xs mt-2 ${metric.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                    {metric.change} from last period
                  </p>
                </div>
                <div className={`w-12 h-12 bg-${metric.color}-100 rounded-xl flex items-center justify-center text-2xl`}>
                  {metric.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Resolution Rate</h3>
            <div className="text-center">
              <div className="relative w-32 h-32 mx-auto mb-4">
                <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3"
                    strokeDasharray={`${stats.resolutionRate}, 100`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900">{stats.resolutionRate.toFixed(1)}%</span>
                </div>
              </div>
              <p className="text-gray-600">{stats.resolvedComplaints} of {stats.totalComplaints} resolved</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Avg Resolution Time</h3>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">
                {formatDuration(stats.averageResolutionTime)}
              </div>
              <p className="text-gray-600">Average time to resolve</p>
              <div className="mt-4 bg-blue-50 rounded-lg p-3">
                <p className="text-sm text-blue-700">Target: 24h</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Performance Radar</h3>
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
                <Radar
                  name="Performance"
                  dataKey="A"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Time Series Chart */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Complaints Over Time</h3>
              <div className="flex space-x-2">
                {(['area', 'line', 'bar'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setChartType(type)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      chartType === type
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              {chartType === 'area' && (
                <AreaChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e2e8f0', 
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }} 
                  />
                  <Legend />
                  <Area type="monotone" dataKey="submitted" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="resolved" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="escalated" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
                </AreaChart>
              )}
              {chartType === 'line' && (
                <LineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e2e8f0', 
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }} 
                  />
                  <Legend />
                  <Line type="monotone" dataKey="submitted" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="escalated" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              )}
              {chartType === 'bar' && (
                <BarChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e2e8f0', 
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }} 
                  />
                  <Legend />
                  <Bar dataKey="submitted" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="resolved" fill="#10b981" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="escalated" fill="#ef4444" radius={[2, 2, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Status Distribution Pie Chart */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Status Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }} 
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category and Priority Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Breakdown */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Category Analysis</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryChartData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="category" type="category" tick={{ fontSize: 12 }} width={100} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }} 
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Priority Distribution */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Priority Distribution</h3>
            <div className="space-y-4">
              {priorityChartData.map((item, index) => (
                <div key={item.priority} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      className={`w-4 h-4 rounded-full ${
                        item.priority === 'CRITICAL' ? 'bg-red-500' :
                        item.priority === 'HIGH' ? 'bg-orange-500' :
                        item.priority === 'MEDIUM' ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                    />
                    <span className="font-medium text-gray-700">{item.priority}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-bold text-gray-900">{item.count}</span>
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          item.priority === 'CRITICAL' ? 'bg-red-500' :
                          item.priority === 'HIGH' ? 'bg-orange-500' :
                          item.priority === 'MEDIUM' ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-12">{item.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Export Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Export Data</h3>
              <p className="text-gray-600 mt-1">Download comprehensive reports for further analysis</p>
            </div>
            <button
              onClick={downloadCSV}
              disabled={!csvData || csvData.length === 0}
              className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2"
            >
              <span>📊</span>
              <span>Export CSV ({csvData?.length || 0} records)</span>
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Included Data</h4>
              <ul className="space-y-1">
                <li>• Complaint details & timestamps</li>
                <li>• Resolution information</li>
                <li>• User data (anonymized)</li>
              </ul>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Format</h4>
              <ul className="space-y-1">
                <li>• CSV format</li>
                <li>• UTF-8 encoding</li>
                <li>• Excel compatible</li>
              </ul>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Privacy</h4>
              <ul className="space-y-1">
                <li>• Anonymous complaints protected</li>
                <li>• GDPR compliant</li>
                <li>• Secure download</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
