import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

interface ModernComplaintFormProps {
  onSuccess: () => void;
}

export function ModernComplaintForm({ onSuccess }: ModernComplaintFormProps) {
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
  const [currentStep, setCurrentStep] = useState(1);

  const createComplaint = useMutation(api.complaints.createComplaint);
  const generateUploadUrl = useMutation(api.complaints.generateUploadUrl);

  const categoryOptions = [
    { 
      value: "TECHNICAL", 
      label: "Technical Issues", 
      icon: "🔧",
      subcategories: ["Software Bug", "Hardware Problem", "Network Issue", "System Outage"],
      description: "Problems with software, hardware, or technical systems"
    },
    { 
      value: "BILLING", 
      label: "Billing & Payments", 
      icon: "💳",
      subcategories: ["Incorrect Charge", "Payment Issue", "Refund Request", "Billing Inquiry"],
      description: "Issues related to billing, payments, or financial matters"
    },
    { 
      value: "SERVICE", 
      label: "Service Quality", 
      icon: "⭐",
      subcategories: ["Poor Service", "Delayed Response", "Unprofessional Behavior", "Service Unavailable"],
      description: "Concerns about service quality or customer experience"
    },
    { 
      value: "HARASSMENT", 
      label: "Harassment", 
      icon: "🚫",
      subcategories: ["Verbal Harassment", "Sexual Harassment", "Cyberbullying", "Intimidation"],
      description: "Any form of harassment or inappropriate behavior"
    },
    { 
      value: "DISCRIMINATION", 
      label: "Discrimination", 
      icon: "⚖️",
      subcategories: ["Racial Discrimination", "Gender Discrimination", "Age Discrimination", "Disability Discrimination"],
      description: "Unfair treatment based on protected characteristics"
    },
    { 
      value: "SAFETY", 
      label: "Safety Concerns", 
      icon: "🛡️",
      subcategories: ["Workplace Safety", "Physical Safety", "Health Hazard", "Security Issue"],
      description: "Safety, security, or health-related concerns"
    },
    { 
      value: "POLICY_VIOLATION", 
      label: "Policy Violation", 
      icon: "📋",
      subcategories: ["Code of Conduct", "Privacy Violation", "Compliance Issue", "Ethical Concern"],
      description: "Violations of company policies or ethical standards"
    },
    { 
      value: "URGENT", 
      label: "Urgent Matter", 
      icon: "🚨",
      subcategories: ["Emergency", "Critical Issue", "Time-Sensitive", "Immediate Attention"],
      description: "Urgent issues requiring immediate attention"
    },
    { 
      value: "GENERAL", 
      label: "General Inquiry", 
      icon: "💬",
      subcategories: ["Information Request", "Suggestion", "Feedback", "Other"],
      description: "General questions, suggestions, or feedback"
    },
    { 
      value: "OTHER", 
      label: "Other", 
      icon: "📝",
      subcategories: ["Miscellaneous", "Not Listed"],
      description: "Issues not covered by other categories"
    },
  ];

  const selectedCategory = categoryOptions.find(cat => cat.value === formData.category);

  const handleFileUpload = async (files: FileList) => {
    if (files.length === 0) return;

    setIsUploading(true);
    const newUploadedFiles: Id<"_storage">[] = [];

    try {
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`File ${file.name} is too large. Maximum size is 10MB.`);
          continue;
        }

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
      
      const complaintId = await createComplaint({
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
      setCurrentStep(1);
      
      onSuccess();
    } catch (error) {
      toast.error("Failed to submit complaint");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (currentStep === 1 && (!formData.title.trim() || !formData.category)) {
      toast.error("Please fill in the title and select a category");
      return;
    }
    if (currentStep === 2 && !formData.description.trim()) {
      toast.error("Please provide a detailed description");
      return;
    }
    setCurrentStep(prev => Math.min(prev + 1, 4));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const getUrgencyColor = (level: number) => {
    if (level <= 3) return 'from-green-400 to-green-600';
    if (level <= 6) return 'from-yellow-400 to-yellow-600';
    if (level <= 8) return 'from-orange-400 to-orange-600';
    return 'from-red-400 to-red-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Submit New Complaint
          </h1>
          <p className="text-gray-600 text-lg">We're here to help resolve your concerns quickly and effectively</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${
                  step <= currentStep 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg' 
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {step}
                </div>
                {step < 4 && (
                  <div className={`w-16 h-1 mx-2 rounded-full transition-all duration-300 ${
                    step < currentStep ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-4">
            <div className="text-sm text-gray-600 font-medium">
              Step {currentStep} of 4: {
                currentStep === 1 ? 'Basic Information' :
                currentStep === 2 ? 'Details & Description' :
                currentStep === 3 ? 'Additional Information' :
                'Review & Submit'
              }
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
          <form onSubmit={handleSubmit} className="p-8">
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <div className="space-y-8">
                {/* Anonymous Option */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-2xl p-6">
                  <label className="flex items-center space-x-4 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isAnonymous}
                      onChange={(e) => setFormData(prev => ({ ...prev, isAnonymous: e.target.checked }))}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
                    />
                    <div>
                      <span className="font-semibold text-blue-900 text-lg">Submit Anonymously</span>
                      <p className="text-blue-700 mt-1">Your identity will be kept completely confidential</p>
                    </div>
                  </label>
                </div>

                {/* Anonymous Contact Info */}
                {formData.isAnonymous && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={formData.anonymousEmail}
                        onChange={(e) => setFormData(prev => ({ ...prev, anonymousEmail: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="your.email@example.com"
                        required={formData.isAnonymous}
                      />
                      <p className="text-xs text-gray-500 mt-2">Required for updates on your complaint</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Phone Number (Optional)
                      </label>
                      <input
                        type="tel"
                        value={formData.anonymousPhone}
                        onChange={(e) => setFormData(prev => ({ ...prev, anonymousPhone: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>
                )}

                {/* Title */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Complaint Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Brief summary of your complaint"
                    required
                  />
                </div>

                {/* Category Selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-4">
                    Category *
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryOptions.map((option) => (
                      <div
                        key={option.value}
                        className={`relative p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md ${
                          formData.category === option.value
                            ? 'border-blue-500 bg-blue-50 shadow-lg'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setFormData(prev => ({ ...prev, category: option.value, subcategory: "" }))}
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{option.icon}</span>
                          <div>
                            <h3 className="font-semibold text-gray-900">{option.label}</h3>
                            <p className="text-xs text-gray-600 mt-1">{option.description}</p>
                          </div>
                        </div>
                        {formData.category === option.value && (
                          <div className="absolute top-2 right-2">
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Subcategory */}
                {selectedCategory && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Subcategory (Optional)
                    </label>
                    <select
                      value={formData.subcategory}
                      onChange={(e) => setFormData(prev => ({ ...prev, subcategory: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="">Select a subcategory</option>
                      {selectedCategory.subcategories.map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Details & Description */}
            {currentStep === 2 && (
              <div className="space-y-8">
                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Detailed Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={8}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                    placeholder="Please provide a detailed description of your complaint, including what happened, when it occurred, and any relevant context..."
                    required
                  />
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-gray-500">Be as specific as possible to help us resolve your issue quickly</p>
                    <p className="text-xs text-gray-400">{formData.description.length} characters</p>
                  </div>
                </div>

                {/* Priority and Urgency */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-4">
                      Priority Level
                    </label>
                    <div className="space-y-3">
                      {[
                        { value: "LOW", label: "Low", desc: "Can wait", color: "green" },
                        { value: "MEDIUM", label: "Medium", desc: "Normal priority", color: "yellow" },
                        { value: "HIGH", label: "High", desc: "Needs attention soon", color: "orange" },
                        { value: "CRITICAL", label: "Critical", desc: "Urgent attention required", color: "red" },
                      ].map((priority) => (
                        <label key={priority.value} className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="radio"
                            name="priority"
                            value={priority.value}
                            checked={formData.priority === priority.value}
                            onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full bg-${priority.color}-500`}></div>
                            <span className="font-medium text-gray-900">{priority.label}</span>
                            <span className="text-sm text-gray-600">- {priority.desc}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-4">
                      Urgency Level: {formData.urgencyLevel}/10
                    </label>
                    <div className="space-y-4">
                      <div className="relative">
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={formData.urgencyLevel}
                          onChange={(e) => setFormData(prev => ({ ...prev, urgencyLevel: parseInt(e.target.value) }))}
                          className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                        />
                        <div 
                          className={`absolute top-0 left-0 h-3 bg-gradient-to-r ${getUrgencyColor(formData.urgencyLevel)} rounded-lg transition-all duration-300`}
                          style={{ width: `${(formData.urgencyLevel / 10) * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Not Urgent</span>
                        <span>Extremely Urgent</span>
                      </div>
                      <div className="text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                          formData.urgencyLevel <= 3 ? 'bg-green-100 text-green-800' :
                          formData.urgencyLevel <= 6 ? 'bg-yellow-100 text-yellow-800' :
                          formData.urgencyLevel <= 8 ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {formData.urgencyLevel <= 3 ? 'Low Urgency' :
                           formData.urgencyLevel <= 6 ? 'Medium Urgency' :
                           formData.urgencyLevel <= 8 ? 'High Urgency' :
                           'Critical Urgency'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Additional Information */}
            {currentStep === 3 && (
              <div className="space-y-8">
                {/* Location */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Location (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Building, floor, department, etc."
                  />
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tags (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Separate tags with commas (e.g., urgent, billing, refund)"
                  />
                  <p className="text-xs text-gray-500 mt-2">Tags help categorize and search complaints</p>
                </div>

                {/* File Attachments */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-4">
                    Attachments (Optional)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:border-blue-400 transition-colors duration-200">
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
                      <div className="text-6xl mb-4">📎</div>
                      <p className="text-lg font-medium text-gray-700 mb-2">
                        {isUploading ? "Uploading..." : "Click to upload files or drag and drop"}
                      </p>
                      <p className="text-sm text-gray-500">
                        Supported: Images, PDF, Word documents (max 10MB each)
                      </p>
                    </label>
                  </div>

                  {/* Uploaded Files List */}
                  {attachments.length > 0 && (
                    <div className="mt-6 space-y-3">
                      <p className="text-sm font-semibold text-gray-700">Uploaded Files:</p>
                      {attachments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              <span className="text-blue-600 font-medium">
                                {file.name.split('.').pop()?.toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{file.name}</p>
                              <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Review & Submit */}
            {currentStep === 4 && (
              <div className="space-y-8">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Review Your Complaint</h3>
                  <p className="text-gray-600">Please review the information below before submitting</p>
                </div>

                <div className="bg-gray-50 rounded-2xl p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Basic Information</h4>
                      <div className="space-y-2 text-sm">
                        <p><span className="font-medium">Title:</span> {formData.title}</p>
                        <p><span className="font-medium">Category:</span> {selectedCategory?.label}</p>
                        {formData.subcategory && <p><span className="font-medium">Subcategory:</span> {formData.subcategory}</p>}
                        <p><span className="font-medium">Priority:</span> {formData.priority}</p>
                        <p><span className="font-medium">Urgency:</span> {formData.urgencyLevel}/10</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Additional Details</h4>
                      <div className="space-y-2 text-sm">
                        {formData.location && <p><span className="font-medium">Location:</span> {formData.location}</p>}
                        {formData.tags && <p><span className="font-medium">Tags:</span> {formData.tags}</p>}
                        <p><span className="font-medium">Anonymous:</span> {formData.isAnonymous ? 'Yes' : 'No'}</p>
                        {formData.isAnonymous && formData.anonymousEmail && (
                          <p><span className="font-medium">Contact Email:</span> {formData.anonymousEmail}</p>
                        )}
                        {attachments.length > 0 && (
                          <p><span className="font-medium">Attachments:</span> {attachments.length} file(s)</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
                    <div className="bg-white p-4 rounded-xl border text-sm text-gray-700">
                      {formData.description}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Previous
              </button>
              
              <div className="flex space-x-4">
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
                    setCurrentStep(1);
                  }}
                  className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                >
                  Clear Form
                </button>
                
                {currentStep < 4 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 font-medium"
                  >
                    Next Step
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting || isUploading}
                    className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium flex items-center space-x-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Complaint</span>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
