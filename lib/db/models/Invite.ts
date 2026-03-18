import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface IInvite extends Document {
  _id: Types.ObjectId;
  token: string;
  email: string | null;
  role: 'admin' | 'user';
  createdBy: Types.ObjectId;
  expiresAt: Date;
  status: 'pending' | 'accepted' | 'revoked';
  usedAt: Date | null;
  usedBy: Types.ObjectId | null;
  revokedAt: Date | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;

  /** Returns true when the invite has expired. */
  isExpired(): boolean;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const InviteSchema = new Schema<IInvite>(
  {
    token: {
      type: String,
      required: [true, 'Token is required'],
      unique: true,
      index: true,
    },
    email: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: {
        values: ['admin', 'user'],
        message: '{VALUE} is not a valid role',
      },
      default: 'user',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required'],
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiration date is required'],
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'accepted', 'revoked'],
        message: '{VALUE} is not a valid status',
      },
      default: 'pending',
      index: true,
    },
    usedAt: {
      type: Date,
      default: null,
    },
    usedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: null,
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

InviteSchema.methods.isExpired = function (this: IInvite): boolean {
  return this.expiresAt.getTime() < Date.now();
};

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------

InviteSchema.index({ createdBy: 1, status: 1 });
InviteSchema.index({ status: 1, expiresAt: 1 });

// ---------------------------------------------------------------------------
// Model Export (serverless-safe)
// ---------------------------------------------------------------------------

const Invite: Model<IInvite> =
  mongoose.models.Invite || mongoose.model<IInvite>('Invite', InviteSchema);

export default Invite;
