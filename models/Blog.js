import mongoose from 'mongoose';

const BlogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
      index: true
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },
    content: {
      type: String,
      required: true,
      trim: true
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
      index: true
    },
    readTime: {
      type: String,
      required: true,
      default: '5 min read'
    },
    points: {
      type: [String],
      default: [],
      validate: {
        validator: function(v) {
          return v.length > 0;
        },
        message: 'At least one key point is required'
      }
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for better performance
BlogSchema.index({ slug: 1 });
BlogSchema.index({ status: 1 });
BlogSchema.index({ date: -1 });
BlogSchema.index({ createdAt: -1 });

// Pre-save middleware to generate slug from title if not provided
BlogSchema.pre('save', function(next) {
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// Static method to find published blogs
BlogSchema.statics.findPublished = function() {
  return this.find({ status: 'published' }).sort({ date: -1 });
};

// Static method to find drafts
BlogSchema.statics.findDrafts = function() {
  return this.find({ status: 'draft' }).sort({ createdAt: -1 });
};

// Static method to find archived blogs
BlogSchema.statics.findArchived = function() {
  return this.find({ status: 'archived' }).sort({ updatedAt: -1 });
};

export default mongoose.model('Blog', BlogSchema);

