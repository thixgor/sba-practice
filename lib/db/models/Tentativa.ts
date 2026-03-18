import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export type StatusTentativa = 'em-andamento' | 'finalizada' | 'expirada';

export interface ITentativa extends Document {
  _id: Types.ObjectId;
  protocolId: string;
  user: Types.ObjectId;
  avaliacao: Types.ObjectId;
  respostas: Types.ObjectId[];
  iniciadaEm: Date;
  finalizadaEm: Date | null;
  duracaoSegundos: number | null;
  pontuacaoTotal: number | null;
  pontuacaoObtida: number | null;
  percentualAcerto: number | null;
  status: StatusTentativa;
  ipAddress: string | null;
  deviceFingerprint: string | null;
  currentQuestionIndex: number;
  // Simulado Evolutivo state
  estadoPaciente: {
    sinaisVitais: Record<string, unknown>;
    ecg: Record<string, unknown>;
    statusPaciente: string;
    historico: Array<{ texto: string; timestamp: Date }>;
  } | null;
  questoesRespondidas: Array<{ questaoIdRef: string; alternativaId: string }>;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const TentativaSchema = new Schema<ITentativa>(
  {
    protocolId: {
      type: String,
      required: [true, 'Protocol ID is required'],
      unique: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },
    avaliacao: {
      type: Schema.Types.ObjectId,
      ref: 'Avaliacao',
      required: [true, 'Assessment reference is required'],
    },
    respostas: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Resposta',
      },
    ],
    iniciadaEm: {
      type: Date,
      required: [true, 'Start time is required'],
    },
    finalizadaEm: {
      type: Date,
      default: null,
    },
    duracaoSegundos: {
      type: Number,
      default: null,
      min: [0, 'Duration cannot be negative'],
    },
    pontuacaoTotal: {
      type: Number,
      default: null,
      min: [0, 'Total score cannot be negative'],
    },
    pontuacaoObtida: {
      type: Number,
      default: null,
      min: [0, 'Obtained score cannot be negative'],
    },
    percentualAcerto: {
      type: Number,
      default: null,
      min: [0, 'Accuracy percentage cannot be negative'],
      max: [100, 'Accuracy percentage cannot exceed 100'],
    },
    status: {
      type: String,
      enum: {
        values: ['em-andamento', 'finalizada', 'expirada'],
        message: '{VALUE} is not a valid attempt status',
      },
      default: 'em-andamento',
    },
    ipAddress: {
      type: String,
      default: null,
    },
    deviceFingerprint: {
      type: String,
      default: null,
    },
    currentQuestionIndex: {
      type: Number,
      default: 0,
      min: [0, 'Question index cannot be negative'],
    },
    // Simulado Evolutivo: track patient state + path through decision tree
    estadoPaciente: {
      type: Schema.Types.Mixed,
      default: null,
    },
    questoesRespondidas: {
      type: [
        {
          questaoIdRef: { type: String, required: true },
          alternativaId: { type: String, required: true },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc: unknown, ret: Record<string, unknown>) {
        delete ret.__v;
        // SECURITY: strip hashed IP and device fingerprint from client responses
        delete ret.ipAddress;
        delete ret.deviceFingerprint;
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

// Compound index for looking up a user's attempts on a specific assessment.
// Most common query pattern: find all attempts by user X on assessment Y.
TentativaSchema.index({ user: 1, avaliacao: 1 });

// Filter by status (e.g., find all in-progress attempts for cleanup/expiration)
TentativaSchema.index({ status: 1, iniciadaEm: 1 });

// Efficient lookup by user for history pages
TentativaSchema.index({ user: 1, iniciadaEm: -1 });

// ---------------------------------------------------------------------------
// Model Export (serverless-safe)
// ---------------------------------------------------------------------------

const Tentativa: Model<ITentativa> =
  mongoose.models.Tentativa ||
  mongoose.model<ITentativa>('Tentativa', TentativaSchema);

export default Tentativa;
