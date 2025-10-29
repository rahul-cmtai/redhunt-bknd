import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema(
  {
    actorType: { type: String, enum: ['admin', 'employer'], required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, required: true },
    action: { type: String, required: true },
    targetType: { type: String, enum: ['candidate', 'employer'], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    metadata: { type: Object },
  },
  { timestamps: true }
);

export default mongoose.model('AuditLog', AuditLogSchema);


