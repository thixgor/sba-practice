import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface ICurso extends Document {
  _id: Types.ObjectId;
  protocolId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  duracao: number | null;
  avaliacoes: Types.ObjectId[];
  isActive: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const CursoSchema = new Schema<ICurso>(
  {
    protocolId: {
      type: String,
      required: [true, 'Protocol ID is required'],
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Course name is required'],
      trim: true,
      maxlength: [300, 'Course name cannot exceed 300 characters'],
    },
    description: {
      type: String,
      default: null,
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    imageUrl: {
      type: String,
      default: null,
    },
    duracao: {
      type: Number,
      default: null,
      min: [0, 'Duration cannot be negative'],
    },
    avaliacoes: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Avaliacao',
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator reference is required'],
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
  }
);

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------

// Efficient filtering by active courses
CursoSchema.index({ isActive: 1, createdAt: -1 });

// Text index for search functionality
CursoSchema.index({ name: 'text', description: 'text' });

// ---------------------------------------------------------------------------
// Model Export (serverless-safe)
// ---------------------------------------------------------------------------

const Curso: Model<ICurso> =
  mongoose.models.Curso || mongoose.model<ICurso>('Curso', CursoSchema);

export default Curso;
