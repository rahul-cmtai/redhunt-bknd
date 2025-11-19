import mongoose from 'mongoose';

const ContactLeadSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true, 
      trim: true,
      maxlength: 200
    },
    email: { 
      type: String, 
      required: true, 
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
      index: true
    },
    company: { 
      type: String, 
      trim: true,
      maxlength: 200
    },
    phone: { 
      type: String, 
      trim: true,
      maxlength: 20
    },
    subject: { 
      type: String, 
      required: true,
      enum: ['pricing', 'partnership', 'other'],
      index: true
    },
    message: { 
      type: String, 
      required: true,
      trim: true,
      maxlength: 5000
    },
    status: {
      type: String,
      enum: ['new', 'read', 'replied', 'archived'],
      default: 'new',
      index: true
    },
    adminNotes: {
      type: String,
      trim: true,
      maxlength: 1000
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for better performance
ContactLeadSchema.index({ email: 1 });
ContactLeadSchema.index({ subject: 1 });
ContactLeadSchema.index({ status: 1 });
ContactLeadSchema.index({ createdAt: -1 });

export default mongoose.model('ContactLead', ContactLeadSchema);

