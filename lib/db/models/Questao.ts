import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// ---------------------------------------------------------------------------
// Sub-document Interfaces
// ---------------------------------------------------------------------------

export interface IAlternativa {
  letra: string;
  texto: string;
}

export interface IVideoConfig {
  /** Encrypted YouTube video ID - never expose to client before exam start */
  videoId: string;
  /** Timestamp in seconds where the video should pause */
  timestampParada: number;
  /** Seconds allowed for the student to respond after pause */
  tempoResposta: number;
}

// ---------------------------------------------------------------------------
// Document Interface
// ---------------------------------------------------------------------------

export type TipoQuestao = 'multipla' | 'discursiva';

// ---------------------------------------------------------------------------
// Simulado Evolutivo sub-document interfaces
// ---------------------------------------------------------------------------

export interface IImpactoSinaisVitais {
  frequenciaCardiaca?: number | null;
  pressaoArterial?: string | null;
  saturacaoOxigenio?: number | null;
  frequenciaRespiratoria?: number | null;
  temperatura?: number | null;
}

export interface IImpactoECG {
  ondaP?: { amplitude?: number; duracao?: number } | null;
  complexoQRS?: { amplitude?: number; duracao?: number } | null;
  ondaT?: { amplitude?: number; duracao?: number } | null;
  segmentoST?: { desvio?: number } | null;
  status?: string | null;
}

export interface IAlternativaEvolutiva {
  id: string;
  texto: string;
  tipo: 'Mais Correto' | 'Menos Correto';
  valor: number;
  proximaQuestao: string | null;
  impactoNoSinaisVitais: IImpactoSinaisVitais | null;
  impactoNoECG: IImpactoECG | null;
  impactoNoStatus: string | null;
  retroalimentacao: string;
}

export interface IContextoClinico {
  atualizacao: string;
  vitaisAtuais: IImpactoSinaisVitais | null;
}

// ---------------------------------------------------------------------------
// Document Interface
// ---------------------------------------------------------------------------

export interface IQuestao extends Document {
  _id: Types.ObjectId;
  avaliacao: Types.ObjectId;
  tipo: TipoQuestao;
  enunciado: string;
  alternativas: IAlternativa[];
  gabarito: string | null;
  respostaComentada: string | null;
  fonteBibliografica: string | null;
  videoConfig: IVideoConfig | null;
  imagemUrl: string | null;
  videoUrl: string | null;
  // Simulado Evolutivo fields
  questaoIdRef: string | null;
  contextoClinico: IContextoClinico | null;
  isFinal: boolean;
  alternativasEvolutivas: IAlternativaEvolutiva[];
  ordem: number;
  pontuacao: number;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Sub-schemas
// ---------------------------------------------------------------------------

const AlternativaSchema = new Schema<IAlternativa>(
  {
    letra: {
      type: String,
      required: [true, 'Alternative letter is required'],
      trim: true,
      maxlength: [2, 'Letter cannot exceed 2 characters'],
    },
    texto: {
      type: String,
      required: [true, 'Alternative text is required'],
      trim: true,
      maxlength: [2000, 'Alternative text cannot exceed 2000 characters'],
    },
  },
  { _id: false }
);

const VideoConfigSchema = new Schema<IVideoConfig>(
  {
    videoId: {
      type: String,
      required: [true, 'Video ID is required for video questions'],
    },
    timestampParada: {
      type: Number,
      required: [true, 'Pause timestamp is required'],
      min: [0, 'Timestamp cannot be negative'],
    },
    tempoResposta: {
      type: Number,
      required: [true, 'Response time is required'],
      min: [1, 'Response time must be at least 1 second'],
    },
  },
  { _id: false }
);

// ---------------------------------------------------------------------------
// Simulado Evolutivo sub-schemas
// ---------------------------------------------------------------------------

const ImpactoSinaisVitaisSchema = new Schema(
  {
    frequenciaCardiaca: { type: Number, default: null },
    pressaoArterial: { type: String, default: null },
    saturacaoOxigenio: { type: Number, default: null },
    frequenciaRespiratoria: { type: Number, default: null },
    temperatura: { type: Number, default: null },
  },
  { _id: false }
);

const ImpactoECGSchema = new Schema(
  {
    ondaP: { type: Schema.Types.Mixed, default: null },
    complexoQRS: { type: Schema.Types.Mixed, default: null },
    ondaT: { type: Schema.Types.Mixed, default: null },
    segmentoST: { type: Schema.Types.Mixed, default: null },
    status: { type: String, default: null },
  },
  { _id: false }
);

const AlternativaEvolutivaSchema = new Schema(
  {
    id: { type: String, required: true },
    texto: { type: String, required: true, maxlength: 2000 },
    tipo: {
      type: String,
      required: true,
      enum: ['Mais Correto', 'Menos Correto'],
    },
    valor: { type: Number, required: true, min: 0, max: 100 },
    proximaQuestao: { type: String, default: null },
    impactoNoSinaisVitais: { type: ImpactoSinaisVitaisSchema, default: null },
    impactoNoECG: { type: ImpactoECGSchema, default: null },
    impactoNoStatus: { type: String, default: null },
    retroalimentacao: { type: String, default: '', maxlength: 5000 },
  },
  { _id: false }
);

const ContextoClinicoSchema = new Schema(
  {
    atualizacao: { type: String, default: '' },
    vitaisAtuais: { type: ImpactoSinaisVitaisSchema, default: null },
  },
  { _id: false }
);

// ---------------------------------------------------------------------------
// Main Schema
// ---------------------------------------------------------------------------

const QuestaoSchema = new Schema<IQuestao>(
  {
    avaliacao: {
      type: Schema.Types.ObjectId,
      ref: 'Avaliacao',
      required: [true, 'Assessment reference is required'],
      index: true,
    },
    tipo: {
      type: String,
      required: [true, 'Question type is required'],
      enum: {
        values: ['multipla', 'discursiva'],
        message: '{VALUE} is not a valid question type',
      },
    },
    enunciado: {
      type: String,
      required: [true, 'Question statement is required'],
      maxlength: [10000, 'Statement cannot exceed 10000 characters'],
    },
    alternativas: {
      type: [AlternativaSchema],
      default: [],
      // Note: minimum alternatives validation is handled by Zod schemas
      // (questaoSchema / questaoEvolutivaSchema) at the API layer.
      // Evolutivo questions use alternativasEvolutivas instead of alternativas,
      // so no mongoose-level constraint is applied here.
    },
    gabarito: {
      type: String,
      default: null,
    },
    respostaComentada: {
      type: String,
      default: null,
      maxlength: [10000, 'Commented answer cannot exceed 10000 characters'],
    },
    fonteBibliografica: {
      type: String,
      default: null,
      maxlength: [2000, 'Bibliographic source cannot exceed 2000 characters'],
    },
    videoConfig: {
      type: VideoConfigSchema,
      default: null,
    },
    imagemUrl: {
      type: String,
      default: null,
      maxlength: [2000, 'Image URL cannot exceed 2000 characters'],
    },
    videoUrl: {
      type: String,
      default: null,
      maxlength: [2000, 'Video URL cannot exceed 2000 characters'],
    },
    // Simulado Evolutivo fields
    questaoIdRef: {
      type: String,
      default: null,
      maxlength: [50, 'Question ID ref cannot exceed 50 characters'],
    },
    contextoClinico: {
      type: ContextoClinicoSchema,
      default: null,
    },
    isFinal: {
      type: Boolean,
      default: false,
    },
    alternativasEvolutivas: {
      type: [AlternativaEvolutivaSchema],
      default: [],
    },
    ordem: {
      type: Number,
      default: 0,
      min: [0, 'Order cannot be negative'],
    },
    pontuacao: {
      type: Number,
      default: 1,
      min: [0, 'Score cannot be negative'],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc: unknown, ret: Record<string, unknown>) {
        delete ret.__v;
        // SECURITY: strip videoConfig.videoId when sending to client
        // This should be handled at the API layer, but as an extra guard:
        // videoConfig is kept here for admin operations.
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

// Efficient ordering of questions within an assessment
QuestaoSchema.index({ avaliacao: 1, ordem: 1 });

// ---------------------------------------------------------------------------
// Model Export (serverless-safe)
// ---------------------------------------------------------------------------

const Questao: Model<IQuestao> =
  mongoose.models.Questao ||
  mongoose.model<IQuestao>('Questao', QuestaoSchema);

export default Questao;
