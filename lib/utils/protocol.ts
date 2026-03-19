/**
 * Protocol ID Generation Module for SBA Practice System
 *
 * Generates unique, human-readable protocol IDs for all system entities.
 * Format: SBA-{YEAR}-{PREFIX}-{NANOID}
 *
 * These IDs are used for:
 * - Document verification via QR codes
 * - Audit trail identification
 * - PDF report references
 * - Public verification page: /verificar/[protocolId]
 */

import { nanoid } from 'nanoid';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** All entity types that receive protocol IDs. */
export type ProtocolEntityType = 'avaliacao' | 'tentativa' | 'user' | 'curso' | 'invite' | 'serialkey';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Three-letter prefixes for each entity type.
 * Makes protocol IDs self-describing.
 */
const PREFIXES: Record<ProtocolEntityType, string> = {
  avaliacao: 'AVL',
  tentativa: 'TEN',
  user: 'USR',
  curso: 'CRS',
  invite: 'INV',
  serialkey: 'SKY',
} as const;

/**
 * Nanoid length per entity type.
 * Tentativas get a longer ID (10) because they are the most numerous entity
 * and must have an extremely low collision probability.
 */
const ID_SIZES: Record<ProtocolEntityType, number> = {
  avaliacao: 8,
  tentativa: 10,
  user: 8,
  curso: 8,
  invite: 10,
  serialkey: 10,
} as const;

// ---------------------------------------------------------------------------
// Core generation
// ---------------------------------------------------------------------------

/**
 * Generate a unique protocol ID for the given entity type.
 *
 * @param type The entity type.
 * @returns A protocol ID string like `SBA-2026-AVL-x7kZ4mQp`.
 *
 * @example
 * ```ts
 * generateProtocolId('avaliacao')  // → "SBA-2026-AVL-x7kZ4mQp"
 * generateProtocolId('tentativa')  // → "SBA-2026-TEN-a8BnR3xYkQ"
 * generateProtocolId('user')       // → "SBA-2026-USR-Lm9pX2wK"
 * generateProtocolId('curso')      // → "SBA-2026-CRS-4nVb7RjD"
 * ```
 */
export function generateProtocolId(type: ProtocolEntityType): string {
  const year = new Date().getFullYear();
  const prefix = PREFIXES[type];
  const size = ID_SIZES[type];
  const id = nanoid(size);

  return `SBA-${year}-${prefix}-${id}`;
}

// ---------------------------------------------------------------------------
// Parsing & validation
// ---------------------------------------------------------------------------

/** Parsed components of a protocol ID. */
export interface ParsedProtocolId {
  /** Full original protocol ID string. */
  raw: string;
  /** Year extracted from the ID. */
  year: number;
  /** Three-letter entity prefix. */
  prefix: string;
  /** The entity type inferred from the prefix, or null if unknown. */
  entityType: ProtocolEntityType | null;
  /** The nanoid portion. */
  uniqueId: string;
}

/** Regex pattern for valid protocol IDs. */
const PROTOCOL_ID_REGEX = /^SBA-(\d{4})-(AVL|TEN|USR|CRS|INV|SKY)-([A-Za-z0-9_-]+)$/;

/**
 * Validate whether a string is a valid SBA protocol ID.
 *
 * @param id The string to validate.
 * @returns `true` if the string matches the protocol ID format.
 */
export function isValidProtocolId(id: string): boolean {
  return PROTOCOL_ID_REGEX.test(id);
}

/**
 * Parse a protocol ID into its components.
 *
 * @param id The protocol ID string.
 * @returns Parsed components, or `null` if the format is invalid.
 *
 * @example
 * ```ts
 * const parsed = parseProtocolId("SBA-2026-TEN-a8BnR3xYkQ");
 * // → { raw: "SBA-2026-TEN-a8BnR3xYkQ", year: 2026, prefix: "TEN",
 * //     entityType: "tentativa", uniqueId: "a8BnR3xYkQ" }
 * ```
 */
export function parseProtocolId(id: string): ParsedProtocolId | null {
  const match = id.match(PROTOCOL_ID_REGEX);
  if (!match) return null;

  const [, yearStr, prefix, uniqueId] = match as [string, string, string, string];
  const year = parseInt(yearStr, 10);

  // Reverse lookup: prefix → entity type
  const prefixToType: Record<string, ProtocolEntityType> = {
    AVL: 'avaliacao',
    TEN: 'tentativa',
    USR: 'user',
    CRS: 'curso',
    INV: 'invite',
    SKY: 'serialkey',
  };

  return {
    raw: id,
    year,
    prefix,
    entityType: prefixToType[prefix] ?? null,
    uniqueId,
  };
}

// ---------------------------------------------------------------------------
// QR Code URL helper
// ---------------------------------------------------------------------------

/**
 * Generate the public verification URL for a protocol ID.
 * This URL is encoded into QR codes on PDF reports.
 *
 * @param protocolId The protocol ID to create a verification URL for.
 * @returns Full verification URL.
 *
 * @example
 * ```ts
 * getVerificationURL("SBA-2026-TEN-a8BnR3xYkQ")
 * // → "https://sba-practice.vercel.app/verificar/SBA-2026-TEN-a8BnR3xYkQ"
 * ```
 */
export function getVerificationURL(protocolId: string): string {
  const baseURL = process.env.NEXT_PUBLIC_APP_URL || 'https://sba-practice.vercel.app';
  return `${baseURL.replace(/\/$/, '')}/verificar/${encodeURIComponent(protocolId)}`;
}
