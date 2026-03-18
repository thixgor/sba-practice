import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface IAuditLog extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId | null;
  action: string;
  resource: string | null;
  resourceId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: Date;
  metadata: Record<string, unknown> | null;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const AuditLogSchema = new Schema<IAuditLog>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      trim: true,
      maxlength: [200, 'Action cannot exceed 200 characters'],
    },
    resource: {
      type: String,
      default: null,
      trim: true,
      maxlength: [200, 'Resource cannot exceed 200 characters'],
    },
    resourceId: {
      type: String,
      default: null,
      trim: true,
      maxlength: [200, 'Resource ID cannot exceed 200 characters'],
    },
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
      maxlength: [1000, 'User agent cannot exceed 1000 characters'],
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    // No updatedAt needed for audit logs - they are immutable records
    timestamps: false,
    toJSON: {
      transform(_doc: unknown, ret: Record<string, unknown>) {
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform(_doc: unknown, ret: Record<string, unknown>) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------

// Primary query: filter by user and time range
AuditLogSchema.index({ user: 1, timestamp: -1 });

// Filter by action type (e.g., find all "login_failed" events)
AuditLogSchema.index({ action: 1, timestamp: -1 });

// Resource-based lookup (e.g., all actions on a specific assessment)
AuditLogSchema.index({ resource: 1, resourceId: 1, timestamp: -1 });

// IP-based lookup for security investigations
AuditLogSchema.index({ ipAddress: 1, timestamp: -1 });

// TTL index: automatically delete audit logs older than 1 year (365 days)
// Adjust the expireAfterSeconds value based on compliance requirements
AuditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 31536000 });

// ---------------------------------------------------------------------------
// Model Export (serverless-safe)
// ---------------------------------------------------------------------------

const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog ||
  mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

export default AuditLog;
