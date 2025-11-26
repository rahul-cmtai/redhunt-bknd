import mongoose from 'mongoose';

const CandidateSchema = new mongoose.Schema(
  {
    // Basic Information (Required)
    name: {
      type: String,
      required: true,
      trim: true
    },
    firstName: {
      type: String,
      trim: true,
      maxlength: 100
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: 100
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
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
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
    // Red-Flagged update history for invited candidates
    updateHistory: [
      {
        points: {
          type: Number,
          default: 1
        },
        date: {
          type: Date,
          default: Date.now
        },
        updatedByRole: {
          type: String,
          enum: ['employer'],
          default: 'employer'
        },
        updatedByName: {
          type: String,
          trim: true
        },
        companyName: {
          type: String,
          trim: true
        },
        employer: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Employer'
        },
        notes: {
          type: String,
          trim: true,
          maxlength: 500
        }
      }
    ],
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
CandidateSchema.index({ employer: 1, mobile: 1 }, { unique: true }); // Mobile unique per employer
CandidateSchema.index({ uan: 1 }, { unique: true, sparse: true });
CandidateSchema.index({ panNumber: 1 }, { unique: true, sparse: true });
CandidateSchema.index({ employer: 1 });
CandidateSchema.index({ createdAt: -1 });
CandidateSchema.index({ name: 1 });
CandidateSchema.index({ mobile: 1 }); // Index for faster mobile lookups
CandidateSchema.index({ 'updateHistory.date': 1 });

// Virtual for formatted mobile number
CandidateSchema.virtual('formattedMobile').get(function() {
  if (this.mobile) {
    return this.mobile.replace(/(\d{5})(\d{5})/, '$1 $2');
  }
  return this.mobile;
});

// Pre-save middleware to keep derived name fields in sync
CandidateSchema.pre('save', function(next) {
  const buildName = () => [this.firstName, this.lastName].filter(Boolean).join(' ').trim();

  if ((this.isModified('firstName') || this.isModified('lastName')) && (this.firstName || this.lastName)) {
    this.name = buildName();
  } else if (!this.name && (this.firstName || this.lastName)) {
    this.name = buildName();
  } else if (!this.firstName && !this.lastName && this.isModified('name') && typeof this.name === 'string' && this.name.trim()) {
    const parts = this.name.trim().split(/\s+/);
    this.firstName = parts.shift() || '';
    this.lastName = parts.join(' ') || '';
  }

  next();
});

// Instance method to check if candidate joined
CandidateSchema.methods.hasJoined = function() {
  return this.joiningStatus === 'joined';
};

// Instance method to check if candidate is problematic
CandidateSchema.methods.isProblematic = function() {
  return this.joiningStatus === 'not_joined';
};

// Static method to find candidates by employer
CandidateSchema.statics.findByEmployer = function(employerId) {
  return this.find({ employer: employerId }).sort({ createdAt: -1 });
};

// Static method to find problematic candidates
CandidateSchema.statics.findProblematic = function(employerId) {
  return this.find({ 
    employer: employerId, 
    joiningStatus: 'not_joined'
  }).sort({ createdAt: -1 });
};

// Method to append an update history entry with auto-incremented points
CandidateSchema.methods.appendUpdateHistory = function({ role, name, companyName, employerId, notes }) {
  const nextPoints = (Array.isArray(this.updateHistory) ? this.updateHistory.length : 0) + 1;
  this.updateHistory = this.updateHistory || [];
  this.updateHistory.push({
    points: nextPoints,
    updatedByRole: role || 'employer',
    updatedByName: name || null,
    companyName: companyName || null,
    employer: employerId || null,
    notes: notes || null
  });
  return this.save();
};

// Helper to resequence points after modifications or deletions
CandidateSchema.methods.resequenceUpdateHistory = function() {
  if (!Array.isArray(this.updateHistory)) return this;
  this.updateHistory.forEach((entry, idx) => {
    entry.points = idx + 1;
  });
  return this;
};

export default mongoose.model('Candidate', CandidateSchema);