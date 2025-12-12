import mongoose from 'mongoose';

const PendingEmployerSchema = new mongoose.Schema(
  {
    // Company Information
    companyName: { 
      type: String, 
      required: true, 
      trim: true,
      maxlength: 200
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
      uppercase: true,
      trim: true,
      match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Please enter a valid PAN number'],
      index: true
    },
    
    // HR Person Information
    hrFirstName: {
      type: String,
      trim: true,
      maxlength: 100
    },
    hrLastName: {
      type: String,
      trim: true,
      maxlength: 100
    },
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
    otp: { 
      type: String,
      required: true
    },
    otpExpiry: { 
      type: Date,
      required: true,
      index: true
    },
    
    // Additional fields for backward compatibility
    passwordHash: { type: String },
    emailOtpCode: { type: String },
    emailOtpExpiresAt: { type: Date },
  },
  { 
    timestamps: true
  }
);

// Indexes for better performance
PendingEmployerSchema.index({ email: 1 });
PendingEmployerSchema.index({ panNumber: 1 });
PendingEmployerSchema.index({ contactNumber: 1 });
// TTL index: Auto-delete documents after OTP expiry (10 minutes)
PendingEmployerSchema.index({ otpExpiry: 1 }, { expireAfterSeconds: 0 });

// Pre-save middleware to handle password hashing
PendingEmployerSchema.pre('save', async function(next) {
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

  const buildHrName = () => {
    return [this.hrFirstName, this.hrLastName].filter(Boolean).join(' ').trim();
  };

  if ((this.isModified('hrFirstName') || this.isModified('hrLastName')) && (this.hrFirstName || this.hrLastName)) {
    this.hrName = buildHrName();
  } else if (!this.hrName && (this.hrFirstName || this.hrLastName)) {
    this.hrName = buildHrName();
  } else if (this.isModified('hrName') && !this.isModified('hrFirstName') && !this.isModified('hrLastName') && typeof this.hrName === 'string' && this.hrName.trim()) {
    const parts = this.hrName.trim().split(/\s+/);
    this.hrFirstName = parts.shift() || '';
    this.hrLastName = parts.join(' ') || '';
  }

  // Sync OTP fields
  if (this.otp) {
    this.emailOtpCode = this.otp;
  }
  if (this.otpExpiry) {
    this.emailOtpExpiresAt = this.otpExpiry;
  }

  next();
});

export default mongoose.model('PendingEmployer', PendingEmployerSchema);

