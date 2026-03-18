import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// ---------------------------------------------------------------------------
// Sub-document Interface
// ---------------------------------------------------------------------------

export interface IConfiguracaoAvaliacao {
  alternativasPadrao: 'ABCD' | 'ABCDE';
  feedbackImediato: boolean;
  feedbackFinal: boolean;
  dataLiberacaoGabarito: Date | null;
  tempoLimiteMinutos: number | null;
  embaralharQuestoes: boolean;
  embaralharAlternativas: boolean;
  tentativasPermitidas: number;
  acessoPublico: boolean;
}

// ---------------------------------------------------------------------------
// Document Interface
// ---------------------------------------------------------------------------

export type TipoAvaliacao =
  | 'pre-teste'
  | 'pos-teste'
  | 'prova'
  | 'simulacao'
  | 'prova-video'
  | 'simulado-evolutivo';

// ---------------------------------------------------------------------------
// Simulado Evolutivo sub-document interfaces
// ---------------------------------------------------------------------------

export interface ISinaisVitais {
  frequenciaCardiaca: number;
  pressaoArterial: string;
  saturacaoOxigenio: number;
  frequenciaRespiratoria: number;
  temperatura: number;
}

export interface IECGParams {
  ondaP: { amplitude: number; duracao: number };
  complexoQRS: { amplitude: number; duracao: number };
  ondaT: { amplitude: number; duracao: number };
  segmentoST: { desvio: number };
  status: string;
}

export interface IPacienteInicial {
  nome: string;
  idade: number;
  sexo: string;
  queixa: string;
  historico: string;
  medicacoes: string;
  sinaisVitais: ISinaisVitais;
  ecg: IECGParams;
  statusPaciente: string;
}

export type ModoFinalizacaoVideo = 'ir-para-resultado' | 'continuar-video';

export interface IAvaliacao extends Document {
  _id: Types.ObjectId;
  protocolId: string;
  name: string;
  description: string | null;
  tipo: TipoAvaliacao;
  curso: Types.ObjectId | null;
  questoes: Types.ObjectId[];
  configuracao: IConfiguracaoAvaliacao;
  preTeste: Types.ObjectId | null;
  pacienteInicial: IPacienteInicial | null;
  // Prova de Vídeo fields
  videoUrl: string | null;
  legendaVideo: string | null;
  modoFinalizacao: ModoFinalizacaoVideo | null;
  isActive: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Sub-schemas
// ---------------------------------------------------------------------------

const ConfiguracaoSchema = new Schema<IConfiguracaoAvaliacao>(
  {
    alternativasPadrao: {
      type: String,
      enum: {
        values: ['ABCD', 'ABCDE'],
        message: '{VALUE} is not a valid option format',
      },
      default: 'ABCDE',
    },
    feedbackImediato: {
      type: Boolean,
      default: false,
    },
    feedbackFinal: {
      type: Boolean,
      default: true,
    },
    dataLiberacaoGabarito: {
      type: Date,
      default: null,
    },
    tempoLimiteMinutos: {
      type: Number,
      default: null,
      min: [1, 'Time limit must be at least 1 minute'],
    },
    embaralharQuestoes: {
      type: Boolean,
      default: false,
    },
    embaralharAlternativas: {
      type: Boolean,
      default: false,
    },
    tentativasPermitidas: {
      type: Number,
      default: 1,
      min: [0, '0 means unlimited, or provide a positive number'],
    },
    acessoPublico: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

// ---------------------------------------------------------------------------
// Main Schema
// ---------------------------------------------------------------------------

const AvaliacaoSchema = new Schema<IAvaliacao>(
  {
    protocolId: {
      type: String,
      required: [true, 'Protocol ID is required'],
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Assessment name is required'],
      trim: true,
      maxlength: [500, 'Assessment name cannot exceed 500 characters'],
    },
    description: {
      type: String,
      default: null,
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    tipo: {
      type: String,
      required: [true, 'Assessment type is required'],
      enum: {
        values: ['pre-teste', 'pos-teste', 'prova', 'simulacao', 'prova-video', 'simulado-evolutivo'],
        message: '{VALUE} is not a valid assessment type',
      },
    },
    curso: {
      type: Schema.Types.ObjectId,
      ref: 'Curso',
      default: null,
    },
    questoes: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Questao',
      },
    ],
    configuracao: {
      type: ConfiguracaoSchema,
      default: () => ({}),
    },
    preTeste: {
      type: Schema.Types.ObjectId,
      ref: 'Avaliacao',
      default: null,
    },
    pacienteInicial: {
      type: Schema.Types.Mixed,
      default: null,
    },
    // Prova de Vídeo fields
    videoUrl: {
      type: String,
      default: null,
      maxlength: [2000, 'Video URL cannot exceed 2000 characters'],
    },
    legendaVideo: {
      type: String,
      default: null,
      maxlength: [2000, 'Video legend cannot exceed 2000 characters'],
    },
    modoFinalizacao: {
      type: String,
      enum: {
        values: ['ir-para-resultado', 'continuar-video', null],
        message: '{VALUE} is not a valid finalization mode',
      },
      default: null,
    },
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

// Filter by type and active status
AvaliacaoSchema.index({ tipo: 1, isActive: 1 });

// Filter by linked course
AvaliacaoSchema.index({ curso: 1, isActive: 1 });

// Pre/post test linking lookup
AvaliacaoSchema.index({ preTeste: 1 }, { sparse: true });

// Text search on name and description
AvaliacaoSchema.index({ name: 'text', description: 'text' });

// ---------------------------------------------------------------------------
// Model Export (serverless-safe)
// ---------------------------------------------------------------------------

const Avaliacao: Model<IAvaliacao> =
  mongoose.models.Avaliacao ||
  mongoose.model<IAvaliacao>('Avaliacao', AvaliacaoSchema);

export default Avaliacao;
