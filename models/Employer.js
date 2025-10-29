import mongoose from 'mongoose';

const EmployerSchema = new mongoose.Schema(
  {
    // Company Information
    companyName: { 
      type: String, 
      required: true, 
      trim: true,
      maxlength: 200,
      index: true 
    },
    address: { 
      type: String, 
      required: true, 
      trim: true,
      maxlength: 500
    },
    panNumber: { 
      type: String, 
      required: true, 
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Please enter a valid PAN number'],
      index: true
    },
    
    // HR Person Information
    hrName: { 
      type: String, 
      required: true, 
      trim: true,
      maxlength: 100
    },
    designation: { 
      type: String, 
      required: true, 
      trim: true,
      maxlength: 100
    },
    contactNumber: { 
      type: String, 
      required: true, 
      trim: true,
      match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit mobile number'],
      index: true
    },
    email: { 
      type: String, 
      required: true, 
      unique: true, 
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
      index: true
    },
    
    // System Fields
    password: { 
      type: String, 
      required: true,
      minlength: 6
    },
    status: { 
      type: String, 
      enum: ['pending', 'approved', 'rejected', 'suspended'], 
      default: 'pending', 
      index: true 
    },
    role: { 
      type: String, 
      enum: ['employer', 'hr'],
      default: 'employer',
      index: true
    },
    trustScore: { 
      type: Number, 
      default: 8.5,
      min: 0,
      max: 10
    },
    emailVerified: { 
      type: Boolean, 
      default: false, 
      index: true 
    },
    otp: { 
      type: String 
    },
    otpExpiry: { 
      type: Date 
    },
    
    // Additional fields for backward compatibility
    industry: { type: String },
    companyCode: { type: String },
    passwordHash: { type: String }, // Keep for backward compatibility
    emailOtpCode: { type: String }, // Keep for backward compatibility
    emailOtpExpiresAt: { type: Date }, // Keep for backward compatibility
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for better performance
EmployerSchema.index({ companyName: 1 });
EmployerSchema.index({ panNumber: 1 });
EmployerSchema.index({ email: 1 });
EmployerSchema.index({ contactNumber: 1 });
EmployerSchema.index({ status: 1 });
EmployerSchema.index({ emailVerified: 1 });
EmployerSchema.index({ role: 1 });

// Pre-save middleware to handle password hashing
EmployerSchema.pre('save', async function(next) {
  // Only hash password if it's modified and not already hashed
  if (this.isModified('password') && !this.password.startsWith('$2b$')) {
    try {
      const bcrypt = await import('bcrypt');
      this.passwordHash = await bcrypt.hash(this.password, 10);
      this.password = this.passwordHash; // Store hashed version in password field too
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Method to check if employer is verified
EmployerSchema.methods.isVerified = function() {
  return this.status === 'approved' && this.emailVerified;
};

// Method to verify email
EmployerSchema.methods.verifyEmail = function(otp) {
  if (!this.otp || !this.otpExpiry) {
    return { success: false, message: 'OTP not requested' };
  }
  
  if (new Date(this.otpExpiry).getTime() < Date.now()) {
    return { success: false, message: 'OTP expired' };
  }
  
  if (String(this.otp) !== String(otp)) {
    return { success: false, message: 'Invalid OTP' };
  }
  
  this.emailVerified = true;
  this.otp = undefined;
  this.otpExpiry = undefined;
  return { success: true, message: 'Email verified successfully' };
};

// Method to generate OTP
EmployerSchema.methods.generateOTP = function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = otp;
  this.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  return otp;
};

// Static method to find verified employers
EmployerSchema.statics.findVerifiedEmployers = function() {
  return this.find({ 
    status: 'approved',
    emailVerified: true
  });
};

// Static method to find pending employers
EmployerSchema.statics.findPendingEmployers = function() {
  return this.find({ 
    status: 'pending'
  });
};

// Virtual for company trust level
EmployerSchema.virtual('trustLevel').get(function() {
  if (this.trustScore >= 9) return 'Excellent';
  if (this.trustScore >= 8) return 'Very Good';
  if (this.trustScore >= 7) return 'Good';
  if (this.trustScore >= 6) return 'Average';
  return 'Below Average';
});

export default mongoose.model('Employer', EmployerSchema);


