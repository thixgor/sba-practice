/**
 * Input Sanitization Module for SBA Practice System
 *
 * Provides server-side sanitization utilities to defend against XSS,
 * NoSQL injection, and malformed input. Every API route should run
 * incoming data through these helpers *before* Zod validation.
 */

import validator from 'validator';

// ---------------------------------------------------------------------------
// HTML / XSS sanitization
// ---------------------------------------------------------------------------

/** Characters that must be escaped to prevent HTML injection. */
const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#96;',
};

const HTML_ESCAPE_REGEX = /[&<>"'/`]/g;

/**
 * Escape HTML entities, trim whitespace, and collapse internal whitespace
 * to a single space. Returns an empty string for falsy inputs.
 *
 * @param input  Raw user string.
 * @param options.maxLength  Optional max length (truncates after escaping).
 * @returns Sanitized string safe for rendering in HTML context.
 */
export function sanitizeString(
  input: unknown,
  options?: { maxLength?: number },
): string {
  if (input === null || input === undefined) return '';
  const raw = String(input);

  // Trim leading/trailing whitespace
  let sanitized = raw.trim();

  // Remove null bytes (common attack vector)
  sanitized = sanitized.replace(/\0/g, '');

  // Escape HTML entities
  sanitized = sanitized.replace(HTML_ESCAPE_REGEX, (char) => HTML_ESCAPE_MAP[char] ?? char);

  // Optionally enforce max length
  if (options?.maxLength && sanitized.length > options.maxLength) {
    sanitized = sanitized.slice(0, options.maxLength);
  }

  return sanitized;
}

/**
 * Sanitize a string without HTML escaping. Useful for fields that will
 * be stored as-is and only displayed in safe contexts (e.g. JSON API responses
 * consumed by React, which auto-escapes).
 */
export function sanitizePlainString(
  input: unknown,
  options?: { maxLength?: number },
): string {
  if (input === null || input === undefined) return '';
  let sanitized = String(input).trim().replace(/\0/g, '');

  if (options?.maxLength && sanitized.length > options.maxLength) {
    sanitized = sanitized.slice(0, options.maxLength);
  }

  return sanitized;
}

// ---------------------------------------------------------------------------
// Email sanitization
// ---------------------------------------------------------------------------

/**
 * Normalize and validate an email address.
 *
 * - Lowercases the entire string
 * - Trims whitespace
 * - Validates format using `validator.isEmail()`
 *
 * @returns The normalized email, or `null` if the format is invalid.
 */
export function sanitizeEmail(input: unknown): string | null {
  if (input === null || input === undefined) return null;

  const raw = String(input).toLowerCase().trim();

  // Remove null bytes
  const cleaned = raw.replace(/\0/g, '');

  if (!validator.isEmail(cleaned)) {
    return null;
  }

  // Use validator's normalize to handle Gmail-style + aliases etc.
  return validator.normalizeEmail(cleaned) || cleaned;
}

// ---------------------------------------------------------------------------
// NoSQL injection prevention
// ---------------------------------------------------------------------------

/**
 * Recursively strip MongoDB operators (keys starting with `$`) from a
 * plain object. This is a defense-in-depth measure on top of Mongoose's
 * built-in sanitization.
 *
 * Handles nested objects and arrays. Non-object inputs are returned as-is.
 *
 * @example
 * ```ts
 * sanitizeMongoQuery({ email: "a@b.com", $gt: "" })
 * // → { email: "a@b.com" }
 *
 * sanitizeMongoQuery({ password: { $ne: "" } })
 * // → { password: {} }
 * ```
 */
export function sanitizeMongoQuery<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;

  // Primitives pass through
  if (typeof obj !== 'object') return obj;

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeMongoQuery(item)) as unknown as T;
  }

  // Handle plain objects
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    // Skip keys that start with $ (MongoDB operators)
    if (key.startsWith('$')) {
      continue;
    }

    // Recursively sanitize nested values
    if (value !== null && typeof value === 'object') {
      sanitized[key] = sanitizeMongoQuery(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}

// ---------------------------------------------------------------------------
// Specialized sanitizers
// ---------------------------------------------------------------------------

/**
 * Sanitize a CPF string (Brazilian tax ID). Strips everything except digits.
 * Returns null if the result is not exactly 11 digits.
 */
export function sanitizeCPF(input: unknown): string | null {
  if (input === null || input === undefined) return null;
  const digits = String(input).replace(/\D/g, '');
  if (digits.length !== 11) return null;
  return digits;
}

/**
 * Sanitize a CRM string (Brazilian medical license). Strips non-alphanumeric
 * characters except slash and dash, normalizes to uppercase.
 */
export function sanitizeCRM(input: unknown): string | null {
  if (input === null || input === undefined) return null;
  const raw = String(input).trim().toUpperCase();
  // CRM format: "CRM/UF 123456" or "123456/UF"
  const cleaned = raw.replace(/[^A-Z0-9/\- ]/g, '');
  if (cleaned.length < 4 || cleaned.length > 20) return null;
  return cleaned;
}

/**
 * Sanitize a URL string. Only allows http: and https: protocols.
 * Returns null for invalid or potentially dangerous URLs.
 */
export function sanitizeURL(input: unknown): string | null {
  if (input === null || input === undefined) return null;
  const raw = String(input).trim();

  if (!validator.isURL(raw, { protocols: ['http', 'https'], require_protocol: false })) {
    return null;
  }

  // Ensure protocol is present
  if (!/^https?:\/\//i.test(raw)) {
    return `https://${raw}`;
  }

  return raw;
}

/**
 * Strip all HTML tags from a string. Useful for rich-text fields where
 * we want to extract plain text.
 */
export function stripHTML(input: unknown): string {
  if (input === null || input === undefined) return '';
  return String(input)
    .replace(/<[^>]*>/g, '')
    .trim();
}

// ---------------------------------------------------------------------------
// Batch sanitization for request bodies
// ---------------------------------------------------------------------------

/**
 * Sanitize all string values in a flat object. Useful for quickly cleaning
 * an entire request body.
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  options?: { maxStringLength?: number },
): T {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = sanitizePlainString(value, { maxLength: options?.maxStringLength });
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = sanitizeObject(value as Record<string, unknown>, options);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}
