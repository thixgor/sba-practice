import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface ICursoAccess {
  curso: Types.ObjectId;
  /** null = unlimited access duration */
  accessDurationMinutes: number | null;
}

export interface ISerialKey extends Document {
  _id: Types.ObjectId;
  protocolId: string;
  /** SHA-256 hash displayed to user / printed on PDF */
  key: string;
  /** Courses this serial key grants access to */
  cursos: ICursoAccess[];
  /** How long the serial key itself is valid for activation (null = never expires) */
  expiresAt: Date | null;
  /** Max number of times this key can be used (null = unlimited) */
  maxUses: number | null;
  /** Current number of times used */
  usedCount: number;
  /** Who used this key */
  usedBy: Array<{
    user: Types.ObjectId;
    usedAt: Date;
  }>;
  status: 'active' | 'expired' | 'revoked' | 'exhausted';
  label: string | null;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;

  isValid(): boolean;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const CursoAccessSchema = new Schema(
  {
    curso: {
      type: Schema.Types.ObjectId,
      ref: 'Curso',
      required: true,
    },
    accessDurationMinutes: {
      type: Number,
      default: null,
    },
  },
  { _id: false },
);

const UsedBySchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    usedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const SerialKeySchema = new Schema<ISerialKey>(
  {
    protocolId: {
      type: String,
      required: [true, 'Protocol ID is required'],
      unique: true,
      index: true,
    },
    key: {
      type: String,
      required: [true, 'Key is required'],
      unique: true,
      index: true,
    },
    cursos: {
      type: [CursoAccessSchema],
      required: true,
      validate: {
        validator: (v: ICursoAccess[]) => v.length > 0,
        message: 'At least one course is required.',
      },
    },
    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },
    maxUses: {
      type: Number,
      default: 1,
      min: [1, 'Max uses must be at least 1'],
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    usedBy: {
      type: [UsedBySchema],
      default: [],
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'expired', 'revoked', 'exhausted'],
        message: '{VALUE} is not a valid status',
      },
      default: 'active',
      index: true,
    },
    label: {
      type: String,
      default: null,
      trim: true,
      maxlength: [200, 'Label cannot exceed 200 characters'],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required'],
    },
  },
  {
    timestamps: true,
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
  },
);

// ---------------------------------------------------------------------------
// Instance Methods
// ---------------------------------------------------------------------------

SerialKeySchema.methods.isValid = function (this: ISerialKey): boolean {
  if (this.status !== 'active') return false;
  if (this.expiresAt && this.expiresAt.getTime() < Date.now()) return false;
  if (this.maxUses !== null && this.usedCount >= this.maxUses) return false;
  return true;
};

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------

SerialKeySchema.index({ createdBy: 1, status: 1 });
SerialKeySchema.index({ status: 1, expiresAt: 1 });
SerialKeySchema.index({ 'usedBy.user': 1 });

// ---------------------------------------------------------------------------
// Model Export (serverless-safe)
// ---------------------------------------------------------------------------

const SerialKey: Model<ISerialKey> =
  mongoose.models.SerialKey || mongoose.model<ISerialKey>('SerialKey', SerialKeySchema);

export default SerialKey;
