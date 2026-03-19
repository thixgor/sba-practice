/**
 * Shared Zod Validation Schemas for SBA Practice System
 *
 * All schemas are validated both client-side (UX) and server-side (security).
 * Never trust client-side validation alone.
 *
 * Uses Zod v4 with the classic API for full backward compatibility.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Reusable field validators
// ---------------------------------------------------------------------------

/** Email field: lowercased, trimmed, validated. */
const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .email('Informe um email valido.');

/** Password with minimum length only (for login, where we don't enforce complexity). */
const passwordFieldSimple = z
  .string()
  .min(6, 'A senha deve ter no minimo 6 caracteres.');

/**
 * Password with complexity requirements (for registration / password change).
 * - At least 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 digit
 * - At least 1 special character
 */
const passwordFieldComplex = z
  .string()
  .min(8, 'A senha deve ter no minimo 8 caracteres.')
  .refine(
    (val) => /[A-Z]/.test(val),
    'A senha deve conter pelo menos uma letra maiuscula.',
  )
  .refine(
    (val) => /[a-z]/.test(val),
    'A senha deve conter pelo menos uma letra minuscula.',
  )
  .refine(
    (val) => /[0-9]/.test(val),
    'A senha deve conter pelo menos um numero.',
  )
  .refine(
    (val) => /[^A-Za-z0-9]/.test(val),
    'A senha deve conter pelo menos um caractere especial.',
  );

/** Brazilian CPF field (optional). Digits only, exactly 11 chars. */
const cpfField = z
  .string()
  .transform((val) => val.replace(/\D/g, ''))
  .refine(
    (val) => val.length === 11,
    'CPF deve conter exatamente 11 digitos.',
  )
  .optional();

/** Brazilian CRM field (optional). Alphanumeric + slash/dash, 4-20 chars. */
const crmField = z
  .string()
  .trim()
  .min(4, 'CRM deve ter no minimo 4 caracteres.')
  .max(20, 'CRM deve ter no maximo 20 caracteres.')
  .optional();

/** Name field with minimum length. */
const nameField = z
  .string()
  .trim()
  .min(2, 'O nome deve ter no minimo 2 caracteres.')
  .max(200, 'O nome deve ter no maximo 200 caracteres.');

/** MongoDB ObjectId as a string. */
const objectIdField = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'ID invalido.');

// ---------------------------------------------------------------------------
// Auth schemas
// ---------------------------------------------------------------------------

/**
 * Login form validation.
 */
export const loginSchema = z.object({
  email: emailField,
  password: passwordFieldSimple,
  captchaToken: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Registration form validation.
 */
export const registerSchema = z.object({
  name: nameField,
  email: emailField,
  password: passwordFieldComplex,
  confirmPassword: z.string(),
  cpf: cpfField,
  crm: crmField,
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: 'As senhas nao coincidem.',
    path: ['confirmPassword'],
  },
);

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Password change / reset validation.
 */
export const changePasswordSchema = z.object({
  currentPassword: passwordFieldSimple.optional(),
  newPassword: passwordFieldComplex,
  confirmPassword: z.string(),
}).refine(
  (data) => data.newPassword === data.confirmPassword,
  {
    message: 'As senhas nao coincidem.',
    path: ['confirmPassword'],
  },
);

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/**
 * Profile update validation.
 */
export const profileUpdateSchema = z.object({
  name: nameField.optional(),
  cpf: cpfField,
  crm: crmField,
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

// ---------------------------------------------------------------------------
// Curso schemas
// ---------------------------------------------------------------------------

/**
 * Course creation / update validation.
 */
export const cursoSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'O nome do curso deve ter no minimo 3 caracteres.')
    .max(300, 'O nome do curso deve ter no maximo 300 caracteres.'),
  description: z
    .string()
    .trim()
    .min(1, 'A descricao e obrigatoria.')
    .max(5000, 'A descricao deve ter no maximo 5000 caracteres.'),
  imageUrl: z
    .string()
    .url('URL da imagem invalida.')
    .optional()
    .or(z.literal('')),
  duracao: z
    .number()
    .positive('A duracao deve ser um numero positivo.')
    .max(10000, 'Duracao maxima excedida.')
    .optional()
    .nullable(),
  isActive: z.boolean().optional().default(true),
});

export type CursoInput = z.infer<typeof cursoSchema>;

// ---------------------------------------------------------------------------
// Avaliacao schemas
// ---------------------------------------------------------------------------

/** Allowed evaluation types. */
export const avaliacaoTipoEnum = z.enum([
  'pre-teste',
  'pos-teste',
  'prova',
  'simulacao',
  'prova-video',
  'simulado-evolutivo',
]);

export type AvaliacaoTipo = z.infer<typeof avaliacaoTipoEnum>;

/** Allowed answer patterns. */
export const alternativasPadraoEnum = z.enum(['ABCD', 'ABCDE']);

/**
 * Evaluation configuration sub-schema.
 */
export const avaliacaoConfigSchema = z.object({
  alternativasPadrao: alternativasPadraoEnum.default('ABCDE'),
  feedbackImediato: z.boolean().default(false),
  feedbackFinal: z.boolean().default(true),
  dataLiberacaoGabarito: z
    .string()
    .datetime({ message: 'Data de liberacao do gabarito invalida.' })
    .optional()
    .nullable(),
  tempoLimiteMinutos: z
    .number()
    .int('O tempo limite deve ser um numero inteiro.')
    .positive('O tempo limite deve ser positivo.')
    .max(600, 'Tempo limite maximo: 600 minutos (10 horas).')
    .optional()
    .nullable(),
  embaralharQuestoes: z.boolean().default(false),
  embaralharAlternativas: z.boolean().default(false),
  tentativasPermitidas: z
    .number()
    .int()
    .min(0, 'Tentativas deve ser 0 (ilimitadas) ou positivo.')
    .default(1),
  acessoPublico: z.boolean().default(false),
});

export type AvaliacaoConfig = z.infer<typeof avaliacaoConfigSchema>;

/** Allowed finalization modes for prova-video. */
export const modoFinalizacaoEnum = z.enum(['ir-para-resultado', 'continuar-video']);

export type ModoFinalizacao = z.infer<typeof modoFinalizacaoEnum>;

/**
 * Evaluation creation / update validation.
 */
export const avaliacaoSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'O nome da avaliacao deve ter no minimo 3 caracteres.')
    .max(300, 'O nome da avaliacao deve ter no maximo 300 caracteres.'),
  description: z
    .string()
    .trim()
    .max(5000, 'A descricao deve ter no maximo 5000 caracteres.')
    .optional()
    .default(''),
  tipo: avaliacaoTipoEnum,
  cursoId: objectIdField.optional().nullable(),
  configuracao: avaliacaoConfigSchema,
  preTesteId: objectIdField.optional().nullable(),
  // Prova de Video fields
  videoUrl: z.string().url('URL de video invalida.').optional().nullable().or(z.literal('')),
  legendaVideo: z.string().trim().max(2000, 'Legenda deve ter no maximo 2000 caracteres.').optional().nullable().or(z.literal('')),
  modoFinalizacao: modoFinalizacaoEnum.optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export type AvaliacaoInput = z.infer<typeof avaliacaoSchema>;

// ---------------------------------------------------------------------------
// Questao schemas
// ---------------------------------------------------------------------------

/** Allowed question types. */
export const questaoTipoEnum = z.enum(['multipla', 'discursiva']);

export type QuestaoTipo = z.infer<typeof questaoTipoEnum>;

/** Single alternative (option) in a multiple choice question. */
export const alternativaSchema = z.object({
  letra: z
    .string()
    .min(1)
    .max(1)
    .regex(/^[A-E]$/, 'A letra deve ser de A a E.'),
  texto: z
    .string()
    .trim()
    .min(1, 'O texto da alternativa e obrigatorio.')
    .max(2000, 'O texto da alternativa deve ter no maximo 2000 caracteres.'),
});

export type AlternativaInput = z.infer<typeof alternativaSchema>;

/** Video question configuration (for prova-video type). */
export const videoConfigSchema = z.object({
  videoId: z
    .string()
    .min(1, 'O ID do video e obrigatorio.'),
  timestampParada: z
    .number()
    .nonnegative('O timestamp de parada deve ser >= 0.')
    .max(86400, 'Timestamp maximo: 86400 segundos (24 horas).'),
  tempoResposta: z
    .number()
    .int()
    .positive('O tempo de resposta deve ser positivo.')
    .max(600, 'Tempo maximo de resposta: 600 segundos (10 minutos).'),
});

export type VideoConfigInput = z.infer<typeof videoConfigSchema>;

/**
 * Question creation / update validation.
 */
export const questaoSchema = z.object({
  enunciado: z
    .string()
    .trim()
    .min(5, 'O enunciado deve ter no minimo 5 caracteres.')
    .max(10000, 'O enunciado deve ter no maximo 10000 caracteres.'),
  tipo: questaoTipoEnum,
  alternativas: z
    .array(alternativaSchema)
    .min(2, 'A questao deve ter pelo menos 2 alternativas.')
    .max(5, 'A questao deve ter no maximo 5 alternativas.')
    .optional()
    .default([]),
  gabarito: z
    .string()
    .regex(/^[A-E]$/, 'O gabarito deve ser uma letra de A a E.')
    .optional()
    .nullable(),
  respostaComentada: z
    .string()
    .trim()
    .max(10000, 'A resposta comentada deve ter no maximo 10000 caracteres.')
    .optional()
    .default(''),
  fonteBibliografica: z
    .string()
    .trim()
    .max(2000, 'A fonte bibliografica deve ter no maximo 2000 caracteres.')
    .optional()
    .default(''),
  videoConfig: videoConfigSchema.optional().nullable(),
  imagemUrl: z.string().url('URL de imagem invalida.').optional().nullable().or(z.literal('')),
  videoUrl: z.string().url('URL de video invalida.').optional().nullable().or(z.literal('')),
  ordem: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .default(0),
  pontuacao: z
    .number()
    .positive('A pontuacao deve ser positiva.')
    .default(1),
}).refine(
  (data) => {
    // Multiple choice questions must have alternativas and gabarito
    if (data.tipo === 'multipla') {
      if (!data.alternativas || data.alternativas.length < 2) {
        return false;
      }
      if (!data.gabarito) {
        return false;
      }
      // Gabarito must be one of the provided alternatives
      const letras = data.alternativas.map((a) => a.letra);
      return letras.includes(data.gabarito);
    }
    return true;
  },
  {
    message: 'Questoes de multipla escolha devem ter alternativas e um gabarito valido.',
    path: ['gabarito'],
  },
);

export type QuestaoInput = z.infer<typeof questaoSchema>;

// ---------------------------------------------------------------------------
// Simulado Evolutivo schemas
// ---------------------------------------------------------------------------

/** Impacto nos sinais vitais (variações). */
export const impactoSinaisVitaisSchema = z.object({
  frequenciaCardiaca: z.number().optional().nullable(),
  pressaoArterial: z.string().optional().nullable(),
  saturacaoOxigenio: z.number().optional().nullable(),
  frequenciaRespiratoria: z.number().optional().nullable(),
  temperatura: z.number().optional().nullable(),
});

/** Impacto no ECG. */
export const impactoECGSchema = z.object({
  ondaP: z.object({ amplitude: z.number().optional(), duracao: z.number().optional() }).optional().nullable(),
  complexoQRS: z.object({ amplitude: z.number().optional(), duracao: z.number().optional() }).optional().nullable(),
  ondaT: z.object({ amplitude: z.number().optional(), duracao: z.number().optional() }).optional().nullable(),
  segmentoST: z.object({ desvio: z.number().optional() }).optional().nullable(),
  status: z.string().optional().nullable(),
});

/** Alternativa evolutiva (for simulado-evolutivo questions). */
export const alternativaEvolutivaSchema = z.object({
  id: z.string().min(1, 'ID da alternativa obrigatorio.'),
  texto: z.string().trim().min(1).max(2000),
  tipo: z.enum(['Mais Correto', 'Menos Correto']),
  valor: z.number().min(0).max(100),
  proximaQuestao: z.string().optional().nullable(),
  impactoNoSinaisVitais: impactoSinaisVitaisSchema.optional().nullable(),
  impactoNoECG: impactoECGSchema.optional().nullable(),
  impactoNoStatus: z.string().optional().nullable(),
  retroalimentacao: z.string().max(5000).default(''),
});

export type AlternativaEvolutivaInput = z.infer<typeof alternativaEvolutivaSchema>;

/** Contexto clínico dinâmico. */
export const contextoClinicoSchema = z.object({
  atualizacao: z.string().max(5000).default(''),
  vitaisAtuais: impactoSinaisVitaisSchema.optional().nullable(),
});

/** Sinais vitais iniciais do paciente. */
export const sinaisVitaisSchema = z.object({
  frequenciaCardiaca: z.number().min(0).max(300),
  pressaoArterial: z.string().min(1),
  saturacaoOxigenio: z.number().min(0).max(100),
  frequenciaRespiratoria: z.number().min(0).max(100),
  temperatura: z.number().min(25).max(45),
});

/** ECG parameters. */
export const ecgParamsSchema = z.object({
  ondaP: z.object({ amplitude: z.number(), duracao: z.number() }),
  complexoQRS: z.object({ amplitude: z.number(), duracao: z.number() }),
  ondaT: z.object({ amplitude: z.number(), duracao: z.number() }),
  segmentoST: z.object({ desvio: z.number() }),
  status: z.string().min(1),
});

/** Paciente inicial (patient template for simulado-evolutivo). */
export const pacienteInicialSchema = z.object({
  nome: z.string().trim().min(1, 'Nome do paciente obrigatorio.').max(200),
  idade: z.number().int().min(0).max(150),
  sexo: z.string().min(1).max(10),
  queixa: z.string().trim().max(2000).default(''),
  historico: z.string().trim().max(5000).default(''),
  medicacoes: z.string().trim().max(2000).default(''),
  sinaisVitais: sinaisVitaisSchema,
  ecg: ecgParamsSchema,
  statusPaciente: z.string().min(1).default('Estável'),
});

export type PacienteInicialInput = z.infer<typeof pacienteInicialSchema>;

/** Questão evolutiva (for simulado-evolutivo). */
export const questaoEvolutivaSchema = z.object({
  questaoIdRef: z.string().min(1, 'ID de referencia obrigatorio.').max(50),
  enunciado: z.string().trim().min(5).max(10000),
  contextoClinico: contextoClinicoSchema.optional().nullable(),
  isFinal: z.boolean().default(false),
  alternativasEvolutivas: z.array(alternativaEvolutivaSchema).min(1, 'Pelo menos 1 alternativa.').max(6),
  ordem: z.number().int().nonnegative().optional().default(0),
  pontuacao: z.number().positive().default(1),
  imagemUrl: z.string().url().optional().nullable().or(z.literal('')),
  videoUrl: z.string().url().optional().nullable().or(z.literal('')),
});

export type QuestaoEvolutivaInput = z.infer<typeof questaoEvolutivaSchema>;

// ---------------------------------------------------------------------------
// Resposta schemas
// ---------------------------------------------------------------------------

/**
 * Answer submission validation.
 */
export const respostaSchema = z.object({
  questaoId: objectIdField,
  alternativaSelecionada: z
    .string()
    .regex(/^[A-E]$/, 'A alternativa deve ser uma letra de A a E.')
    .optional()
    .nullable(),
  respostaDiscursiva: z
    .string()
    .trim()
    .max(10000, 'A resposta discursiva deve ter no maximo 10000 caracteres.')
    .optional()
    .nullable(),
  // Simulado Evolutivo fields
  alternativaEvolutivaId: z.string().optional().nullable(),
});
// No refine — allow empty submissions for video exam timeouts and skipped questions.
// The server marks unanswered questions as correta: false.

export type RespostaInput = z.infer<typeof respostaSchema>;

/**
 * Batch answer submission (for submitting multiple answers at once).
 */
export const respostasBatchSchema = z.object({
  respostas: z
    .array(respostaSchema)
    .min(1, 'Envie pelo menos uma resposta.'),
});

export type RespostasBatchInput = z.infer<typeof respostasBatchSchema>;

// ---------------------------------------------------------------------------
// Tentativa schemas
// ---------------------------------------------------------------------------

/** Allowed attempt statuses. */
export const tentativaStatusEnum = z.enum([
  'em-andamento',
  'finalizada',
  'expirada',
]);

export type TentativaStatus = z.infer<typeof tentativaStatusEnum>;

/**
 * Start an evaluation attempt.
 */
export const iniciarTentativaSchema = z.object({
  avaliacaoId: objectIdField,
  captchaToken: z.string().optional(),
});

export type IniciarTentativaInput = z.infer<typeof iniciarTentativaSchema>;

/**
 * Finalize an attempt.
 */
export const finalizarTentativaSchema = z.object({
  tentativaId: objectIdField,
});

export type FinalizarTentativaInput = z.infer<typeof finalizarTentativaSchema>;

// ---------------------------------------------------------------------------
// Video timestamp schema
// ---------------------------------------------------------------------------

/**
 * Video playback timestamp update (polling from client during prova-video).
 */
export const videoTimestampSchema = z.object({
  tentativaId: objectIdField,
  currentTime: z
    .number()
    .nonnegative('O tempo atual deve ser >= 0.'),
  action: z.enum(['play', 'pause', 'progress', 'end']),
});

export type VideoTimestampInput = z.infer<typeof videoTimestampSchema>;

// ---------------------------------------------------------------------------
// Pagination & filtering schemas
// ---------------------------------------------------------------------------

/**
 * Common pagination parameters for list endpoints.
 */
export const paginationSchema = z.object({
  page: z
    .number()
    .int()
    .positive()
    .default(1),
  limit: z
    .number()
    .int()
    .positive()
    .max(100, 'Limite maximo: 100 itens por pagina.')
    .default(20),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

/**
 * Search query parameter.
 */
export const searchSchema = z.object({
  q: z
    .string()
    .trim()
    .max(200, 'A busca deve ter no maximo 200 caracteres.')
    .optional()
    .default(''),
});

export type SearchInput = z.infer<typeof searchSchema>;

// ---------------------------------------------------------------------------
// Admin user management schemas
// ---------------------------------------------------------------------------

/**
 * Admin: create user.
 */
export const adminCreateUserSchema = z.object({
  name: nameField,
  email: emailField,
  password: passwordFieldComplex,
  role: z.enum(['admin', 'user']).default('user'),
  cpf: cpfField,
  crm: crmField,
  isActive: z.boolean().optional().default(true),
});

export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;

/**
 * Admin: update user.
 */
export const adminUpdateUserSchema = z.object({
  name: nameField.optional(),
  email: emailField.optional(),
  role: z.enum(['admin', 'user']).optional(),
  isActive: z.boolean().optional(),
  cpf: cpfField,
  crm: crmField,
});

export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;

// ---------------------------------------------------------------------------
// Invite schemas
// ---------------------------------------------------------------------------

/**
 * Admin: create invite link.
 */
export const createInviteSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Informe um email valido.')
    .optional()
    .or(z.literal('')),
  role: z.enum(['admin', 'user']).default('user'),
  expiresInHours: z
    .number()
    .int()
    .positive('O tempo de expiracao deve ser positivo.')
    .max(720, 'Tempo maximo de expiracao: 720 horas (30 dias).')
    .default(48),
});

export type CreateInviteInput = z.infer<typeof createInviteSchema>;

/**
 * Accept invite and register.
 */
export const acceptInviteSchema = z.object({
  name: nameField,
  email: emailField,
  password: passwordFieldComplex,
  confirmPassword: z.string(),
  cpf: cpfField,
  crm: crmField,
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: 'As senhas nao coincidem.',
    path: ['confirmPassword'],
  },
);

export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;

// ---------------------------------------------------------------------------
// Utility: parse helpers
// ---------------------------------------------------------------------------

/**
 * Parse pagination params from URL search params (string values).
 * Converts string query params into the proper typed pagination object.
 */
export const paginationFromSearchParams = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform((val) => {
      const num = parseInt(val, 10);
      return isNaN(num) || num < 1 ? 1 : num;
    }),
  limit: z
    .string()
    .optional()
    .default('20')
    .transform((val) => {
      const num = parseInt(val, 10);
      return isNaN(num) || num < 1 ? 20 : Math.min(num, 100);
    }),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z
    .string()
    .optional()
    .default('desc')
    .transform((val) => (val === 'asc' ? 'asc' as const : 'desc' as const)),
});

export type PaginationFromSearchParams = z.infer<typeof paginationFromSearchParams>;

// ---------------------------------------------------------------------------
// Serial Key schemas
// ---------------------------------------------------------------------------

/** Course access entry for serial keys. */
export const serialKeyCursoAccessSchema = z.object({
  cursoId: objectIdField,
  /** Access duration in minutes. null = unlimited */
  accessDurationMinutes: z
    .number()
    .int()
    .positive('A duracao de acesso deve ser positiva.')
    .max(525600, 'Duracao maxima: 525600 minutos (365 dias).')
    .optional()
    .nullable(),
});

/**
 * Admin: create serial key.
 */
export const createSerialKeySchema = z.object({
  cursos: z
    .array(serialKeyCursoAccessSchema)
    .min(1, 'Selecione pelo menos um curso.'),
  /** Key expiration in minutes (null = never expires) */
  expiresInMinutes: z
    .number()
    .int()
    .positive('O tempo de expiracao deve ser positivo.')
    .max(525600, 'Expiracao maxima: 525600 minutos (365 dias).')
    .optional()
    .nullable(),
  maxUses: z
    .number()
    .int()
    .positive('O numero maximo de usos deve ser positivo.')
    .max(10000, 'Maximo de 10000 usos.')
    .optional()
    .nullable()
    .default(1),
  label: z
    .string()
    .trim()
    .max(200, 'Label deve ter no maximo 200 caracteres.')
    .optional()
    .nullable(),
});

export type CreateSerialKeyInput = z.infer<typeof createSerialKeySchema>;

/**
 * User: activate serial key.
 */
export const activateSerialKeySchema = z.object({
  key: z
    .string()
    .trim()
    .min(1, 'A chave serial e obrigatoria.')
    .max(128, 'Chave serial invalida.'),
});

export type ActivateSerialKeyInput = z.infer<typeof activateSerialKeySchema>;

// ---------------------------------------------------------------------------
// Updated invite schema with course access
// ---------------------------------------------------------------------------

/**
 * Admin: create invite link with optional course access.
 */
export const createInviteWithCoursesSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Informe um email valido.')
    .optional()
    .or(z.literal('')),
  role: z.enum(['admin', 'user']).default('user'),
  expiresInHours: z
    .number()
    .int()
    .positive('O tempo de expiracao deve ser positivo.')
    .max(720, 'Tempo maximo de expiracao: 720 horas (30 dias).')
    .default(48),
  /** Courses to grant access to upon invite acceptance */
  cursos: z
    .array(serialKeyCursoAccessSchema)
    .optional()
    .default([]),
});
