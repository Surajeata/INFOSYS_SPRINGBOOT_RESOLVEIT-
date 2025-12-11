import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

interface ComplaintDetailsProps {
  complaintId: Id<"complaints">;
  userProfile: {
    role: "USER" | "ADMIN" | "MODERATOR" | "SUPER_ADMIN";
  };
  onBack: () => void;
  anonymousEmail?: string;
}

export function ComplaintDetails({ complaintId, userProfile, onBack }: ComplaintDetailsProps) {
  const [newStatus, setNewStatus] = useState<string>("");
  const [statusNotes, setStatusNotes] = useState("");
  const [resolution, setResolution] = useState("");
  const [newNote, setNewNote] = useState("");
  const [isPublicNote, setIsPublicNote] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const complaint = useQuery(api.complaints.getComplaintById, { complaintId });
  const history = useQuery(api.complaints.getComplaintHistory, { complaintId });
  const notes = useQuery(api.complaints.getComplaintNotes, { 
    complaintId,
    publicOnly: userProfile.role === "USER"
  });
  const staff = useQuery(
    api.users.getAllStaff,
    userProfile.role === "ADMIN" || userProfile.role === "MODERATOR" ? {} : "skip"
  );

  const updateStatus = useMutation(api.complaints.updateComplaintStatus);
  const assignComplaint = useMutation(api.complaints.assignComplaint);
  const addNote = useMutation(api.complaints.addInternalNote);

  const isStaff = userProfile.role === "ADMIN" || userProfile.role === "MODERATOR";

  if (!complaint) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatus) {
      toast.error("Please select a status");
      return;
    }

    setIsUpdating(true);
    try {
      await updateStatus({
        complaintId,
        status: newStatus as any,
        notes: statusNotes.trim() || undefined,
        resolution: resolution.trim() || undefined,
      });
      toast.success("Status updated successfully");
      setNewStatus("");
      setStatusNotes("");
      setResolution("");
    } catch (error) {
      toast.error("Failed to update status");
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAssignment = async (assignedToId: string) => {
    if (!assignedToId) return;

    try {
      await assignComplaint({
        complaintId,
        assignedTo: assignedToId as Id<"users">,
      });
      toast.success("Complaint assigned successfully");
    } catch (error) {
      toast.error("Failed to assign complaint");
      console.error(error);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) {
      toast.error("Please enter a note");
      return;
    }

    try {
      await addNote({
        complaintId,
        note: newNote.trim(),
        isPublic: isPublicNote,
      });
      toast.success(isPublicNote ? "Public reply sent to user" : "Internal note added");
      setNewNote("");
      setIsPublicNote(false);
    } catch (error) {
      toast.error("Failed to add note");
      console.error(error);
    }
  };

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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center text-blue-600 hover:text-blue-800 font-medium"
        >
          ← Back to List
        </button>
        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(complaint.status)}`}>
            {complaint.status.replace("_", " ")}
          </span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(complaint.priority)}`}>
            {complaint.priority}
          </span>
        </div>
      </div>

      {/* Complaint Details */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-6 border border-blue-200">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{complaint.title}</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-3">
            <span className="text-sm font-medium text-gray-500">Category</span>
            <p className="text-gray-900 font-semibold">{complaint.category}</p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <span className="text-sm font-medium text-gray-500">Priority</span>
            <p className="text-gray-900 font-semibold">{complaint.priority}</p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <span className="text-sm font-medium text-gray-500">Submitted by</span>
            <p className="text-gray-900 font-semibold">{complaint.ownerName}</p>
            <p className="text-xs text-gray-600">{complaint.ownerEmail}</p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <span className="text-sm font-medium text-gray-500">Created</span>
            <p className="text-gray-900 font-semibold">{new Date(complaint._creationTime).toLocaleDateString()}</p>
            <p className="text-xs text-gray-600">{new Date(complaint._creationTime).toLocaleTimeString()}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4">
          <span className="text-sm font-medium text-gray-500">Description</span>
          <p className="text-gray-900 mt-2 whitespace-pre-wrap leading-relaxed">{complaint.description}</p>
        </div>

        {complaint.resolution && (
          <div className="bg-green-50 rounded-lg p-4 mt-4 border border-green-200">
            <span className="text-sm font-medium text-green-700">Resolution</span>
            <p className="text-green-900 mt-2 whitespace-pre-wrap leading-relaxed">{complaint.resolution}</p>
            {complaint.resolvedAt && (
              <p className="text-xs text-green-600 mt-2">
                Resolved on {new Date(complaint.resolvedAt).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status History */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            📋 Status History
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {history?.map((entry, index) => (
              <div key={entry._id} className="bg-white border rounded-lg p-4 relative">
                {index < (history.length - 1) && (
                  <div className="absolute left-4 top-12 w-0.5 h-8 bg-gray-200"></div>
                )}
                <div className="flex justify-between items-start mb-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(entry.status)}`}>
                    {entry.status.replace("_", " ")}
                  </span>
                  <span className="text-sm text-gray-500">
                    {new Date(entry.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-1">By: {entry.changedByName}</p>
                {entry.notes && (
                  <p className="text-sm text-gray-900 bg-gray-50 rounded p-2">{entry.notes}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Notes and Communication */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            💬 {userProfile.role === "USER" ? "Updates & Replies" : "Notes & Communication"}
          </h3>
          <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
            {notes?.map((note) => (
              <div key={note._id} className={`border rounded-lg p-4 ${
                note.isPublic ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"
              }`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">{note.createdByName}</span>
                    {note.isPublic ? (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full flex items-center">
                        👁️ Public Reply
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full flex items-center">
                        🔒 Internal Note
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(note._creationTime).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">{note.note}</p>
              </div>
            ))}
          </div>

          {/* Add Note Form (Staff Only) */}
          {isStaff && (
            <form onSubmit={handleAddNote} className="bg-white border rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                ✏️ Add Note or Reply
              </h4>
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                placeholder="Enter your note or reply to the user..."
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={isPublicNote}
                    onChange={(e) => setIsPublicNote(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    {isPublicNote ? "📧 Send as public reply to user" : "🔒 Keep as internal note"}
                  </span>
                </label>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {isPublicNote ? "Send Reply" : "Add Note"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Admin Actions */}
      {isStaff && (
        <div className="mt-6 bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            ⚙️ Admin Actions
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Update Status */}
            <div className="bg-gray-50 rounded-lg p-4">
              <form onSubmit={handleStatusUpdate}>
                <h4 className="font-medium text-gray-900 mb-3">Update Status</h4>
                <div className="space-y-3">
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select new status...</option>
                    <option value="SUBMITTED">Submitted</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="UNDER_REVIEW">Under Review</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                    <option value="ESCALATED">Escalated</option>
                  </select>
                  
                  <textarea
                    value={statusNotes}
                    onChange={(e) => setStatusNotes(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Status update notes (optional)..."
                  />

                  {(newStatus === "RESOLVED" || newStatus === "CLOSED") && (
                    <textarea
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Describe how this complaint was resolved..."
                    />
                  )}

                  <button
                    type="submit"
                    disabled={isUpdating || !newStatus}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {isUpdating ? "Updating..." : "Update Status"}
                  </button>
                </div>
              </form>
            </div>

            {/* Assign Complaint */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Assignment</h4>
              <select
                onChange={(e) => handleAssignment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                defaultValue=""
              >
                <option value="">Assign to staff member...</option>
                {staff?.map((member) => (
                  <option key={member._id} value={member.userId}>
                    {member.firstName} {member.lastName} ({member.role})
                  </option>
                ))}
              </select>
              
              {complaint.assignedTo && (
                <div className="bg-green-50 border border-green-200 rounded p-3">
                  <p className="text-sm text-green-800 font-medium">
                    ✅ Currently Assigned
                  </p>
                  <p className="text-sm text-green-600">
                    This complaint is assigned to a staff member
                  </p>
                </div>
              )}
              
              {!complaint.assignedTo && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                  <p className="text-sm text-yellow-800 font-medium">
                    ⚠️ Unassigned
                  </p>
                  <p className="text-sm text-yellow-600">
                    This complaint needs to be assigned to a staff member
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
