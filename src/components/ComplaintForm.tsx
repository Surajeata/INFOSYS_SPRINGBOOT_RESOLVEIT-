import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

interface ComplaintFormProps {
  onSuccess: () => void;
}

export function ComplaintForm({ onSuccess }: ComplaintFormProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    subcategory: "",
    priority: "MEDIUM",
    location: "",
    tags: "",
    urgencyLevel: 5,
    isAnonymous: false,
    anonymousEmail: "",
    anonymousPhone: "",
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<Id<"_storage">[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const createComplaint = useMutation(api.complaints.createComplaint);
  const generateUploadUrl = useMutation(api.complaints.generateUploadUrl);

  const categoryOptions = [
    { value: "TECHNICAL", label: "Technical Issues", subcategories: ["Software Bug", "Hardware Problem", "Network Issue", "System Outage"] },
    { value: "BILLING", label: "Billing & Payments", subcategories: ["Incorrect Charge", "Payment Issue", "Refund Request", "Billing Inquiry"] },
    { value: "SERVICE", label: "Service Quality", subcategories: ["Poor Service", "Delayed Response", "Unprofessional Behavior", "Service Unavailable"] },
    { value: "HARASSMENT", label: "Harassment", subcategories: ["Verbal Harassment", "Sexual Harassment", "Cyberbullying", "Intimidation"] },
    { value: "DISCRIMINATION", label: "Discrimination", subcategories: ["Racial Discrimination", "Gender Discrimination", "Age Discrimination", "Disability Discrimination"] },
    { value: "SAFETY", label: "Safety Concerns", subcategories: ["Workplace Safety", "Physical Safety", "Health Hazard", "Security Issue"] },
    { value: "POLICY_VIOLATION", label: "Policy Violation", subcategories: ["Code of Conduct", "Privacy Violation", "Compliance Issue", "Ethical Concern"] },
    { value: "URGENT", label: "Urgent Matter", subcategories: ["Emergency", "Critical Issue", "Time-Sensitive", "Immediate Attention"] },
    { value: "GENERAL", label: "General Inquiry", subcategories: ["Information Request", "Suggestion", "Feedback", "Other"] },
    { value: "OTHER", label: "Other", subcategories: ["Miscellaneous", "Not Listed"] },
  ];

  const selectedCategory = categoryOptions.find(cat => cat.value === formData.category);

  const handleFileUpload = async (files: FileList) => {
    if (files.length === 0) return;

    setIsUploading(true);
    const newUploadedFiles: Id<"_storage">[] = [];

    try {
      for (const file of Array.from(files)) {
        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`File ${file.name} is too large. Maximum size is 10MB.`);
          continue;
        }

        // Check file type
        const allowedTypes = [
          'image/jpeg', 'image/png', 'image/gif', 'image/webp',
          'application/pdf', 'text/plain', 'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        
        if (!allowedTypes.includes(file.type)) {
          toast.error(`File type ${file.type} is not supported.`);
          continue;
        }

        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!result.ok) {
          throw new Error(`Upload failed for ${file.name}`);
        }

        const { storageId } = await result.json();
        newUploadedFiles.push(storageId);
      }

      setUploadedFiles(prev => [...prev, ...newUploadedFiles]);
      setAttachments(prev => [...prev, ...Array.from(files)]);
      toast.success(`${newUploadedFiles.length} file(s) uploaded successfully`);
    } catch (error) {
      toast.error("Failed to upload files");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.description.trim() || !formData.category) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (formData.isAnonymous && !formData.anonymousEmail.trim()) {
      toast.error("Email is required for anonymous complaints");
      return;
    }

    setIsSubmitting(true);
    try {
      const tags = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      
      await createComplaint({
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category as any,
        subcategory: formData.subcategory.trim() || undefined,
        priority: formData.priority as any,
        location: formData.location.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        urgencyLevel: formData.urgencyLevel,
        isAnonymous: formData.isAnonymous,
        anonymousEmail: formData.isAnonymous ? formData.anonymousEmail.trim() : undefined,
        anonymousPhone: formData.isAnonymous ? formData.anonymousPhone.trim() || undefined : undefined,
        attachments: uploadedFiles.length > 0 ? uploadedFiles : undefined,
      });

      toast.success("Complaint submitted successfully!");
      
      // Reset form
      setFormData({
        title: "",
        description: "",
        category: "",
        subcategory: "",
        priority: "MEDIUM",
        location: "",
        tags: "",
        urgencyLevel: 5,
        isAnonymous: false,
        anonymousEmail: "",
        anonymousPhone: "",
      });
      setAttachments([]);
      setUploadedFiles([]);
      
      onSuccess();
    } catch (error) {
      toast.error("Failed to submit complaint");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Submit New Complaint</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Anonymous Option */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={formData.isAnonymous}
              onChange={(e) => setFormData(prev => ({ ...prev, isAnonymous: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="font-medium text-blue-900">Submit Anonymously</span>
              <p className="text-sm text-blue-700">Your identity will be kept confidential</p>
            </div>
          </label>
        </div>

        {/* Anonymous Contact Info */}
        {formData.isAnonymous && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="anonymousEmail" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                id="anonymousEmail"
                value={formData.anonymousEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, anonymousEmail: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="your.email@example.com"
                required={formData.isAnonymous}
              />
              <p className="text-xs text-gray-500 mt-1">Required for updates on your complaint</p>
            </div>
            <div>
              <label htmlFor="anonymousPhone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                id="anonymousPhone"
                value={formData.anonymousPhone}
                onChange={(e) => setFormData(prev => ({ ...prev, anonymousPhone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>
        )}

        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Complaint Title *
          </label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Brief summary of your complaint"
            required
          />
        </div>

        {/* Category and Subcategory */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category *
            </label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value, subcategory: "" }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select a category</option>
              {categoryOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          {selectedCategory && (
            <div>
              <label htmlFor="subcategory" className="block text-sm font-medium text-gray-700 mb-1">
                Subcategory
              </label>
              <select
                id="subcategory"
                value={formData.subcategory}
                onChange={(e) => setFormData(prev => ({ ...prev, subcategory: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a subcategory</option>
                {selectedCategory.subcategories.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Priority and Urgency */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
              Priority Level
            </label>
            <select
              id="priority"
              value={formData.priority}
              onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="LOW">Low - Can wait</option>
              <option value="MEDIUM">Medium - Normal priority</option>
              <option value="HIGH">High - Needs attention soon</option>
              <option value="CRITICAL">Critical - Urgent attention required</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="urgencyLevel" className="block text-sm font-medium text-gray-700 mb-1">
              Urgency Level: {formData.urgencyLevel}/10
            </label>
            <input
              type="range"
              id="urgencyLevel"
              min="1"
              max="10"
              value={formData.urgencyLevel}
              onChange={(e) => setFormData(prev => ({ ...prev, urgencyLevel: parseInt(e.target.value) }))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Not Urgent</span>
              <span>Extremely Urgent</span>
            </div>
          </div>
        </div>

        {/* Location */}
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
            Location (Optional)
          </label>
          <input
            type="text"
            id="location"
            value={formData.location}
            onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Building, floor, department, etc."
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Detailed Description *
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Please provide a detailed description of your complaint, including what happened, when it occurred, and any relevant context..."
            required
          />
        </div>

        {/* Tags */}
        <div>
          <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
            Tags (Optional)
          </label>
          <input
            type="text"
            id="tags"
            value={formData.tags}
            onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Separate tags with commas (e.g., urgent, billing, refund)"
          />
          <p className="text-xs text-gray-500 mt-1">Tags help categorize and search complaints</p>
        </div>

        {/* File Attachments */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Attachments (Optional)
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.txt,.doc,.docx"
              onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
              className="hidden"
              id="file-upload"
              disabled={isUploading}
            />
            <label
              htmlFor="file-upload"
              className={`cursor-pointer ${isUploading ? 'opacity-50' : ''}`}
            >
              <div className="text-gray-400 text-4xl mb-2">📎</div>
              <p className="text-gray-600">
                {isUploading ? "Uploading..." : "Click to upload files or drag and drop"}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Supported: Images, PDF, Word documents (max 10MB each)
              </p>
            </label>
          </div>

          {/* Uploaded Files List */}
          {attachments.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-gray-700">Uploaded Files:</p>
              {attachments.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                  <span className="text-sm text-gray-700">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => {
              setFormData({
                title: "",
                description: "",
                category: "",
                subcategory: "",
                priority: "MEDIUM",
                location: "",
                tags: "",
                urgencyLevel: 5,
                isAnonymous: false,
                anonymousEmail: "",
                anonymousPhone: "",
              });
              setAttachments([]);
              setUploadedFiles([]);
            }}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Clear Form
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isUploading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isSubmitting ? "Submitting..." : "Submit Complaint"}
          </button>
        </div>
      </form>
    </div>
  );
}
