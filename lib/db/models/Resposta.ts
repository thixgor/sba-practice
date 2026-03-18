import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface IResposta extends Document {
  _id: Types.ObjectId;
  tentativa: Types.ObjectId;
  questao: Types.ObjectId;
  user: Types.ObjectId;
  alternativaSelecionada: string | null;
  respostaDiscursiva: string | null;
  correta: boolean | null;
  tempoResposta: number | null;
  respondidaEm: Date;
  // Simulado Evolutivo fields
  alternativaEvolutivaId: string | null;
  tipoResposta: 'Mais Correto' | 'Menos Correto' | null;
  valorObtido: number | null;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const RespostaSchema = new Schema<IResposta>(
  {
    tentativa: {
      type: Schema.Types.ObjectId,
      ref: 'Tentativa',
      required: [true, 'Attempt reference is required'],
    },
    questao: {
      type: Schema.Types.ObjectId,
      ref: 'Questao',
      required: [true, 'Question reference is required'],
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },
    alternativaSelecionada: {
      type: String,
      default: null,
      maxlength: [2, 'Selected alternative cannot exceed 2 characters'],
    },
    respostaDiscursiva: {
      type: String,
      default: null,
      maxlength: [50000, 'Discursive answer cannot exceed 50000 characters'],
    },
    correta: {
      type: Boolean,
      default: null,
    },
    tempoResposta: {
      type: Number,
      default: null,
      min: [0, 'Response time cannot be negative'],
    },
    respondidaEm: {
      type: Date,
      default: Date.now,
    },
    // Simulado Evolutivo fields
    alternativaEvolutivaId: {
      type: String,
      default: null,
    },
    tipoResposta: {
      type: String,
      enum: ['Mais Correto', 'Menos Correto', null],
      default: null,
    },
    valorObtido: {
      type: Number,
      default: null,
      min: [0, 'Score cannot be negative'],
      max: [100, 'Score cannot exceed 100'],
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

// Primary lookup: all answers for a given attempt
RespostaSchema.index({ tentativa: 1 });

// Prevent duplicate answers: one answer per question per attempt
RespostaSchema.index({ tentativa: 1, questao: 1 }, { unique: true });

// Analytics: aggregate answers per question across all attempts
RespostaSchema.index({ questao: 1, correta: 1 });

// User history lookup
RespostaSchema.index({ user: 1, respondidaEm: -1 });

// ---------------------------------------------------------------------------
// Model Export (serverless-safe)
// ---------------------------------------------------------------------------

const Resposta: Model<IResposta> =
  mongoose.models.Resposta ||
  mongoose.model<IResposta>('Resposta', RespostaSchema);

export default Resposta;
