import mongoose from 'mongoose';

const CandidateUserSchema = new mongoose.Schema(
  {
    // Basic Information
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String },
    pan: { type: String, required: true, unique: true, sparse: true },
    uan: { type: String, unique: true, sparse: true },
    passwordHash: { type: String, required: true },
    
    // Personal Information
    fathersName: { type: String, required: true },
    gender: { 
      type: String, 
      required: true,
      enum: ['male', 'female', 'other', 'prefer-not-to-say']
    },
    dob: { type: Date, required: true },
    permanentAddress: { type: String, required: true },
    currentAddress: { type: String, required: true },
    mobileNumber: { type: String, required: true },
    primaryEmail: { type: String, required: true, unique: true, lowercase: true },
    secondaryEmail: { type: String, lowercase: true, default: null },
    
    // Professional Information
    panNumber: { type: String, required: true, uppercase: true },
    uanNumber: { type: String, default: null },
    highestQualification: { 
      type: String, 
      required: true,
      enum: ['high-school', 'diploma', 'bachelor', 'master', 'phd', 'mba', 'other']
    },
    workExperience: { type: Number, required: true, min: 0, max: 50 },
    sector: { 
      type: String, 
      required: true,
      enum: [
        'it', 'fmcg', 'banking', 'healthcare', 'manufacturing', 'retail', 
        'automotive', 'telecom', 'education', 'consulting', 'real-estate', 
        'logistics', 'media', 'pharmaceuticals', 'energy', 'other'
      ]
    },
    presentCompany: { type: String, required: true },
    designation: { type: String, required: true },
    workLocation: { type: String, required: true },
    openToRelocation: { 
      type: String, 
      required: true,
      enum: ['yes', 'no', 'maybe']
    },
    currentCtc: { type: String, required: true },
    expectedHikePercentage: { type: String, required: true },
    noticePeriod: { type: Number, required: true, min: 0, max: 365 },
    negotiableDays: { type: Number, required: true, min: 0, max: 365 },
    skillSets: [{
      type: String,
      enum: [
        'javascript', 'python', 'java', 'react', 'angular', 'vue', 'nodejs', 
        'php', 'csharp', 'cpp', 'sql', 'mongodb', 'aws', 'azure', 'docker', 
        'kubernetes', 'devops', 'machine-learning', 'data-analysis', 
        'project-management', 'sales', 'marketing', 'hr', 'finance', 
        'accounting', 'design', 'ui-ux', 'content-writing', 'digital-marketing', 'other'
      ]
    }],
    
    // Account Status
    status: { 
      type: String, 
      enum: ['pending', 'approved', 'rejected', 'suspended'], 
      default: 'pending', 
      index: true 
    },
    role: { type: String, default: 'candidate' },
    emailVerified: { type: Boolean, default: false, index: true },
    
    // Email Verification
    emailOtpCode: { type: String },
    emailOtpExpiresAt: { type: Date },
    
    // Profile Completeness
    profileCompleteness: { type: Number, min: 0, max: 100, default: 0 },
    
    // Admin Verification
    verifiedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Admin',
      default: null 
    },
    verifiedAt: { type: Date, default: null },
    verificationNotes: { type: String, default: null },
    
    // Additional Fields
    isInvited: { type: Boolean, default: false },
    invitationToken: String,
    invitationExpires: Date,
    createdBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Employer',
      default: null 
    },

    // Update history: tracks admin/employer updates with sequential points
    updateHistory: [
      {
        points: { type: Number, required: true },
        date: { type: Date, default: Date.now },
        updatedByRole: { type: String, enum: ['admin', 'employer'], required: true },
        updatedByName: { type: String, default: null },
        companyName: { type: String, default: null },
        employer: { type: mongoose.Schema.Types.ObjectId, ref: 'Employer', default: null },
        admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
        notes: { type: String, default: null }
      }
    ]
  },
  { timestamps: true }
);

// Indexes for better performance
CandidateUserSchema.index({ email: 1 });
CandidateUserSchema.index({ pan: 1 });
CandidateUserSchema.index({ uan: 1 });
CandidateUserSchema.index({ status: 1 });
CandidateUserSchema.index({ emailVerified: 1 });
CandidateUserSchema.index({ sector: 1 });
CandidateUserSchema.index({ workLocation: 1 });
CandidateUserSchema.index({ skillSets: 1 });
CandidateUserSchema.index({ 'updateHistory.date': 1 });

// Pre-save middleware to calculate profile completeness
CandidateUserSchema.pre('save', function(next) {
  const requiredFields = [
    'fullName', 'fathersName', 'gender', 'dob', 'permanentAddress', 'currentAddress',
    'mobileNumber', 'primaryEmail', 'panNumber', 'highestQualification',
    'workExperience', 'sector', 'presentCompany', 'designation', 'workLocation',
    'openToRelocation', 'currentCtc', 'expectedHikePercentage', 'noticePeriod',
    'negotiableDays', 'skillSets'
  ];
  
  let completedFields = 0;
  requiredFields.forEach(field => {
    if (this[field] && (Array.isArray(this[field]) ? this[field].length > 0 : true)) {
      completedFields++;
    }
  });
  
  this.profileCompleteness = Math.round((completedFields / requiredFields.length) * 100);
  next();
});

// Method to check if user is verified
CandidateUserSchema.methods.isVerified = function() {
  return this.status === 'approved' && this.emailVerified;
};

// Method to verify user (admin function)
CandidateUserSchema.methods.verifyUser = function(adminId, notes) {
  this.status = 'approved';
  this.verifiedBy = adminId;
  this.verifiedAt = new Date();
  if (notes) {
    this.verificationNotes = notes;
  }
  return this.save();
};

// Method to reject user (admin function)
CandidateUserSchema.methods.rejectUser = function(adminId, notes) {
  this.status = 'rejected';
  this.verifiedBy = adminId;
  this.verifiedAt = new Date();
  if (notes) {
    this.verificationNotes = notes;
  }
  return this.save();
};

// Method to append an update history entry with auto-incremented points
CandidateUserSchema.methods.appendUpdateHistory = function({ role, name, companyName, employerId, adminId, notes }) {
  const nextPoints = (Array.isArray(this.updateHistory) ? this.updateHistory.length : 0) + 1;
  this.updateHistory = this.updateHistory || [];
  this.updateHistory.push({
    points: nextPoints,
    updatedByRole: role,
    updatedByName: name || null,
    companyName: companyName || null,
    employer: employerId || null,
    admin: adminId || null,
    notes: notes || null
  });
  return this.save();
};

// Helper to resequence points after modifications or deletions
CandidateUserSchema.methods.resequenceUpdateHistory = function() {
  if (!Array.isArray(this.updateHistory)) return this;
  // Keep current order, just reset points sequentially
  this.updateHistory.forEach((entry, idx) => {
    entry.points = idx + 1;
  });
  return this;
};

// Static method to find verified users
CandidateUserSchema.statics.findVerifiedUsers = function() {
  return this.find({ 
    status: 'approved',
    emailVerified: true
  });
};

// Static method to find pending users
CandidateUserSchema.statics.findPendingUsers = function() {
  return this.find({ 
    status: 'pending'
  });
};

export default mongoose.model('CandidateUser', CandidateUserSchema);



