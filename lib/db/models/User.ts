import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface IUser extends Document {
  _id: Types.ObjectId;
  protocolId: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'user';
  cpf: string | null;
  crm: string | null;
  cursos: Types.ObjectId[];
  lastLogin: Date | null;
  isActive: boolean;
  loginAttempts: number;
  lockUntil: Date | null;
  refreshTokens: string[];
  createdAt: Date;
  updatedAt: Date;

  /** Returns true when the account is currently locked out due to failed login attempts. */
  isLocked(): boolean;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const UserSchema = new Schema<IUser>(
  {
    protocolId: {
      type: String,
      required: [true, 'Protocol ID is required'],
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [200, 'Name cannot exceed 200 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      maxlength: [254, 'Email cannot exceed 254 characters'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false, // Never returned by default in queries
    },
    role: {
      type: String,
      enum: {
        values: ['admin', 'user'],
        message: '{VALUE} is not a valid role',
      },
      default: 'user',
      index: true,
    },
    cpf: {
      type: String,
      default: null,
    },
    crm: {
      type: String,
      default: null,
    },
    cursos: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Curso',
      },
    ],
    lastLogin: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    loginAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
    refreshTokens: {
      type: [String],
      default: [],
      select: false, // Never returned by default in queries
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc: unknown, ret: Record<string, unknown>) {
        delete ret.passwordHash;
        delete ret.refreshTokens;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform(_doc: unknown, ret: Record<string, unknown>) {
        delete ret.passwordHash;
        delete ret.refreshTokens;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ---------------------------------------------------------------------------
// Instance Methods
// ---------------------------------------------------------------------------

/**
 * Checks if the account is currently locked.
 * An account is locked when `lockUntil` is set and is in the future.
 */
UserSchema.methods.isLocked = function (this: IUser): boolean {
  if (!this.lockUntil) return false;
  return this.lockUntil.getTime() > Date.now();
};

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------

// Compound index for efficient lookup of active users by role
UserSchema.index({ role: 1, isActive: 1 });

// Sparse index on lockUntil for finding locked accounts efficiently
UserSchema.index({ lockUntil: 1 }, { sparse: true });

// ---------------------------------------------------------------------------
// Model Export (serverless-safe)
// ---------------------------------------------------------------------------

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
