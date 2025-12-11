import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ModernComplaintForm } from "./ModernComplaintForm";
import { ComplaintList } from "./ComplaintList";
import { AdminDashboard } from "./AdminDashboard";
import { ComplaintDetails } from "./ComplaintDetails";
import { ModernAnalyticsDashboard } from "./ModernAnalyticsDashboard";
import { Id } from "../../convex/_generated/dataModel";
import { motion } from "framer-motion";
import { 
  BarChart3, 
  Plus, 
  Settings, 
  FileText, 
  TrendingUp,
  Users,
  AlertTriangle,
  CheckCircle
} from "lucide-react";

interface ComplaintDashboardProps {
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

export function ComplaintDashboard({ userProfile }: ComplaintDashboardProps) {
  const [activeTab, setActiveTab] = useState<"my-complaints" | "create" | "admin" | "analytics" | "details">("my-complaints");
  const [selectedComplaintId, setSelectedComplaintId] = useState<Id<"complaints"> | null>(null);

  const userComplaints = useQuery(api.complaints.getUserComplaints);
  const dashboardStats = useQuery(api.analytics.getDashboardStats, {});

  const isStaff = ["ADMIN", "MODERATOR", "SUPER_ADMIN"].includes(userProfile.role);

  const handleViewComplaint = (complaintId: Id<"complaints">) => {
    setSelectedComplaintId(complaintId);
    setActiveTab("details");
  };

  const handleBackToList = () => {
    setSelectedComplaintId(null);
    setActiveTab(isStaff ? "admin" : "my-complaints");
  };

  const tabVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
    hover: { scale: 1.02, y: -5 }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Header with Stats */}
      <motion.div 
        className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200/50 p-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-6 lg:space-y-0">
          <div>
            <motion.h1 
              className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              Welcome back, {userProfile.firstName}! 👋
            </motion.h1>
            <motion.p 
              className="text-gray-600 mt-2 text-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              {isStaff ? "Manage complaints and support users efficiently" : "Submit and track your complaints seamlessly"}
            </motion.p>
          </div>

          {/* Quick Stats */}
          {isStaff && dashboardStats && (
            <motion.div 
              className="grid grid-cols-2 lg:grid-cols-4 gap-4"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              {[
                { label: "Total", value: dashboardStats.totalComplaints, icon: FileText, color: "blue" },
                { label: "Pending", value: dashboardStats.pendingComplaints, icon: AlertTriangle, color: "yellow" },
                { label: "Resolved", value: dashboardStats.resolvedComplaints, icon: CheckCircle, color: "green" },
                { label: "Rate", value: `${dashboardStats.resolutionRate.toFixed(1)}%`, icon: TrendingUp, color: "purple" },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  className={`bg-gradient-to-br from-${stat.color}-50 to-${stat.color}-100 rounded-2xl p-4 border border-${stat.color}-200`}
                  variants={cardVariants}
                  whileHover="hover"
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: 0.8 + index * 0.1 }}
                >
                  <div className="flex items-center space-x-3">
                    <stat.icon className={`w-8 h-8 text-${stat.color}-600`} />
                    <div>
                      <p className={`text-2xl font-bold text-${stat.color}-700`}>{stat.value}</p>
                      <p className={`text-sm text-${stat.color}-600`}>{stat.label}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Navigation Tabs */}
      {activeTab !== "details" && (
        <motion.div 
          className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl border border-gray-200/50 overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <div className="flex overflow-x-auto">
            {[
              { 
                id: isStaff ? "admin" : "my-complaints", 
                label: isStaff ? "Dashboard" : `My Complaints (${userComplaints?.length || 0})`, 
                icon: isStaff ? BarChart3 : FileText,
                color: "blue"
              },
              ...(isStaff ? [
                { id: "my-complaints", label: `My Complaints (${userComplaints?.length || 0})`, icon: FileText, color: "green" },
                { id: "analytics", label: "Analytics", icon: TrendingUp, color: "purple" }
              ] : [
                { id: "create", label: "Create Complaint", icon: Plus, color: "green" }
              ])
            ].map((tab) => (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-3 px-8 py-6 font-medium text-sm transition-all duration-300 relative ${
                  activeTab === tab.id
                    ? `text-${tab.color}-600 bg-gradient-to-r from-${tab.color}-50 to-${tab.color}-100`
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <tab.icon className="w-5 h-5" />
                <span className="whitespace-nowrap">{tab.label}</span>
                {activeTab === tab.id && (
                  <motion.div
                    className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-${tab.color}-500 to-${tab.color}-600 rounded-t-full`}
                    layoutId="activeTab"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Tab Content */}
      <motion.div 
        className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl border border-gray-200/50 overflow-hidden"
        variants={tabVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={{ duration: 0.4 }}
      >
        {activeTab === "my-complaints" && !isStaff && (
          <ComplaintList
            complaints={userComplaints || []}
            onViewComplaint={handleViewComplaint}
            title="My Complaints"
            emptyMessage="You haven't submitted any complaints yet. Click 'Create Complaint' to get started!"
          />
        )}

        {activeTab === "create" && (
          <ModernComplaintForm onSuccess={() => setActiveTab("my-complaints")} />
        )}

        {activeTab === "admin" && isStaff && (
          <AdminDashboard userProfile={userProfile} />
        )}

        {activeTab === "my-complaints" && isStaff && (
          <ComplaintList
            complaints={userComplaints || []}
            onViewComplaint={handleViewComplaint}
            title="My Personal Complaints"
            emptyMessage="You haven't submitted any personal complaints yet."
          />
        )}

        {activeTab === "analytics" && isStaff && (
          <ModernAnalyticsDashboard />
        )}

        {activeTab === "details" && selectedComplaintId && (
          <ComplaintDetails
            complaintId={selectedComplaintId}
            userProfile={userProfile}
            onBack={handleBackToList}
          />
        )}
      </motion.div>
    </div>
  );
}
