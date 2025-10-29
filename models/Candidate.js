import mongoose from 'mongoose';

const CandidateSchema = new mongoose.Schema(
  {
    // Basic Information (Required)
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    },
    mobile: {
      type: String,
      required: true,
      trim: true,
      match: [/^[0-9+\-\s()]{10,15}$/, 'Please enter a valid mobile number']
    },
    position: {
      type: String,
      required: true,
      trim: true
    },
    offerDate: {
      type: Date,
      required: true
    },
    offerStatus: {
      type: String,
      required: true,
      enum: [
        'Offer Letter Given',
        'Offer Accepted', 
        'Offer Rejected',
        'Not Joined After Acceptance',
        'Ghosted After Offer',
        'Joined But Left Early',
        'Blacklisted'
      ]
    },
    reason: {
      type: String,
      required: true,
      enum: [
        'Accepted Another Offer',
        'Counter Offer from Current Company',
        'Salary Expectations Not Met',
        'Location Not Suitable',
        'Family Issues',
        'Health Issues',
        'No Response After Acceptance',
        'Ghosted Completely',
        'Asked for More Time Then Disappeared',
        'Joined But Left Within 1 Month',
        'Joined But Left Within 3 Months',
        'Performance Issues',
        'Misrepresented Information',
        'Other'
      ]
    },
    
    // Professional Information (Optional)
    uan: {
      type: String,
      trim: true,
      uppercase: true,
      sparse: true,
      match: [/^[0-9]{12}$/, 'Please enter a valid 12-digit UAN']
    },
    panNumber: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 10,
      sparse: true,
      match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Please enter a valid PAN number']
    },
    designation: {
      type: String,
      trim: true
    },
    currentCompany: {
      type: String,
      trim: true
    },
    joiningDate: {
      type: Date
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500
    },
    
    // System Fields
    joiningStatus: {
      type: String,
      enum: ['joined', 'not_joined', 'pending'],
      default: 'pending',
      index: true
    },
    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employer',
      required: true,
      index: true
    },
    employerName: {
      type: String,
      trim: true
    },
    verified: {
      type: Boolean,
      default: false,
      index: true
    },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
CandidateSchema.index({ employer: 1, email: 1 }, { unique: true });
CandidateSchema.index({ email: 1 }, { unique: true });
CandidateSchema.index({ uan: 1 }, { unique: true, sparse: true });
CandidateSchema.index({ panNumber: 1 }, { unique: true, sparse: true });
CandidateSchema.index({ employer: 1 });
CandidateSchema.index({ offerStatus: 1 });
CandidateSchema.index({ createdAt: -1 });
CandidateSchema.index({ name: 1 });

// Virtual for formatted mobile number
CandidateSchema.virtual('formattedMobile').get(function() {
  if (this.mobile) {
    return this.mobile.replace(/(\d{5})(\d{5})/, '$1 $2');
  }
  return this.mobile;
});

// Pre-save middleware to update joiningStatus based on offerStatus
CandidateSchema.pre('save', function(next) {
  if (this.offerStatus) {
    switch (this.offerStatus) {
      case 'Joined But Left Early':
        this.joiningStatus = 'not_joined';
        break;
      case 'Offer Accepted':
        this.joiningStatus = 'pending';
        break;
      case 'Offer Rejected':
      case 'Not Joined After Acceptance':
      case 'Ghosted After Offer':
      case 'Blacklisted':
        this.joiningStatus = 'not_joined';
        break;
      default:
        this.joiningStatus = 'pending';
    }
  }
  next();
});

// Instance method to check if candidate joined
CandidateSchema.methods.hasJoined = function() {
  return this.joiningStatus === 'joined';
};

// Instance method to check if candidate is problematic
CandidateSchema.methods.isProblematic = function() {
  const problematicStatuses = [
    'Not Joined After Acceptance',
    'Ghosted After Offer',
    'Joined But Left Early',
    'Blacklisted'
  ];
  return problematicStatuses.includes(this.offerStatus);
};

// Static method to find candidates by employer
CandidateSchema.statics.findByEmployer = function(employerId) {
  return this.find({ employer: employerId }).sort({ createdAt: -1 });
};

// Static method to find problematic candidates
CandidateSchema.statics.findProblematic = function(employerId) {
  const problematicStatuses = [
    'Not Joined After Acceptance',
    'Ghosted After Offer',
    'Joined But Left Early',
    'Blacklisted'
  ];
  return this.find({ 
    employer: employerId, 
    offerStatus: { $in: problematicStatuses } 
  }).sort({ createdAt: -1 });
};

export default mongoose.model('Candidate', CandidateSchema);