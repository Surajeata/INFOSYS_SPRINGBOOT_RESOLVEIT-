import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { ComplaintDashboard } from "./components/ComplaintDashboard";
import { ProfileSetup } from "./components/ProfileSetup";
import { AdminSetup } from "./components/AdminSetup";
import { NotificationCenter } from "./components/NotificationCenter";
import { useState } from "react";
import { motion } from "framer-motion";

export default function App() {
  const [showAdminSetup, setShowAdminSetup] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Modern Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
          <motion.div 
            className="flex items-center space-x-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">R</span>
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                ResolveIt
              </h2>
              <p className="text-xs text-gray-500 -mt-1">Smart Grievance System</p>
            </div>
          </motion.div>
          
          <div className="flex items-center space-x-4">
            <Authenticated>
              <NotificationCenter />
              <motion.button
                onClick={() => setShowAdminSetup(!showAdminSetup)}
                className="px-4 py-2 text-sm bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {showAdminSetup ? "Hide Admin Setup" : "Admin Setup"}
              </motion.button>
              <SignOutButton />
            </Authenticated>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6">
        <Content showAdminSetup={showAdminSetup} />
      </main>
      
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          },
        }}
      />
    </div>
  );
}

function Content({ showAdminSetup }: { showAdminSetup: boolean }) {
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const userProfile = useQuery(api.users.getUserProfile);

  if (loggedInUser === undefined || userProfile === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <motion.div 
          className="flex flex-col items-center space-y-4"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 opacity-20 animate-pulse"></div>
          </div>
          <p className="text-gray-600 font-medium">Loading your dashboard...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <Unauthenticated>
        <motion.div 
          className="max-w-md mx-auto mt-20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-center mb-8">
            <motion.h1 
              className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              Welcome to ResolveIt
            </motion.h1>
            <motion.p 
              className="text-xl text-gray-600"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              Next-Generation Grievance Management
            </motion.p>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, duration: 0.4 }}
          >
            <SignInForm />
          </motion.div>
        </motion.div>
      </Unauthenticated>

      <Authenticated>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {showAdminSetup ? (
            <AdminSetup />
          ) : !userProfile ? (
            <ProfileSetup />
          ) : (
            <ComplaintDashboard userProfile={userProfile} />
          )}
        </motion.div>
      </Authenticated>
    </div>
  );
}
