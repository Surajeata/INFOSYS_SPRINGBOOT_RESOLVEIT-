import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export function AdminSetup() {
  const [userEmail, setUserEmail] = useState("");
  const [isPromoting, setIsPromoting] = useState(false);

  const promoteToAdmin = useMutation(api.users.promoteToAdmin);

  const handlePromote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    setIsPromoting(true);
    try {
      await promoteToAdmin({
        userEmail: userEmail.trim(),
      });
      toast.success("User promoted to admin successfully!");
      setUserEmail("");
    } catch (error) {
      toast.error("Failed to promote user to admin");
      console.error(error);
    } finally {
      setIsPromoting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          🔧 Admin Setup
        </h2>
        <p className="text-gray-600 mb-6 text-center">
          Promote a user to admin to access the admin dashboard
        </p>
        
        <form onSubmit={handlePromote} className="space-y-4">
          <div>
            <label htmlFor="userEmail" className="block text-sm font-medium text-gray-700 mb-1">
              User Email to Promote
            </label>
            <input
              type="email"
              id="userEmail"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="user@example.com"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the email of a user who has already created a profile
            </p>
          </div>

          <button
            type="submit"
            disabled={isPromoting}
            className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
          >
            {isPromoting ? "Promoting..." : "Promote to Admin"}
          </button>
        </form>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">How to access admin dashboard:</h3>
          <ol className="text-sm text-blue-800 space-y-1">
            <li>1. Create a regular user account and profile</li>
            <li>2. Use this form to promote that user to admin</li>
            <li>3. Sign in as that user to see the admin dashboard</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
