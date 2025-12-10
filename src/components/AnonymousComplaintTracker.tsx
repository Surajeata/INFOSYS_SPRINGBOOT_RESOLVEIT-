import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { ComplaintDetails } from "./ComplaintDetails";

export function AnonymousComplaintTracker() {
  const [trackingData, setTrackingData] = useState({
    complaintId: "",
    email: "",
  });
  const [isTracking, setIsTracking] = useState(false);
  const [complaint, setComplaint] = useState<any>(null);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingData.complaintId.trim() || !trackingData.email.trim()) {
      return;
    }

    setIsTracking(true);
    // The query will be triggered by the state change
  };

  const trackedComplaint = useQuery(
    api.complaints.getAnonymousComplaint,
    isTracking && trackingData.complaintId && trackingData.email
      ? {
          complaintId: trackingData.complaintId as Id<"complaints">,
          email: trackingData.email,
        }
      : "skip"
  );

  // Update complaint state when query result changes
  if (isTracking && trackedComplaint !== undefined) {
    if (trackedComplaint && !complaint) {
      setComplaint(trackedComplaint);
    } else if (!trackedComplaint && complaint === null) {
      // Complaint not found or access denied
      setComplaint(false);
    }
  }

  const handleBack = () => {
    setIsTracking(false);
    setComplaint(null);
    setTrackingData({ complaintId: "", email: "" });
  };

  if (complaint) {
    return (
      <ComplaintDetails
        complaintId={complaint._id}
        userProfile={{ role: "USER" }}
        onBack={handleBack}
        anonymousEmail={trackingData.email}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Track Your Complaint</h1>
            <p className="text-gray-600">
              Enter your complaint ID and email to track the status of your anonymous complaint
            </p>
          </div>

          <form onSubmit={handleTrack} className="space-y-4">
            <div>
              <label htmlFor="complaintId" className="block text-sm font-medium text-gray-700 mb-1">
                Complaint ID
              </label>
              <input
                type="text"
                id="complaintId"
                value={trackingData.complaintId}
                onChange={(e) => setTrackingData(prev => ({ ...prev, complaintId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your complaint ID"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                You received this ID when you submitted your complaint
              </p>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={trackingData.email}
                onChange={(e) => setTrackingData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter the email you used"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                The email address you provided when submitting the complaint
              </p>
            </div>

            <button
              type="submit"
              disabled={isTracking}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isTracking ? "Tracking..." : "Track Complaint"}
            </button>
          </form>

          {complaint === false && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">
                Complaint not found or email doesn't match. Please check your complaint ID and email address.
              </p>
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">Need Help?</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Make sure you're using the exact complaint ID provided</li>
              <li>• Use the same email address you submitted the complaint with</li>
              <li>• Contact support if you can't find your complaint ID</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
