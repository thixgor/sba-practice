/**
 * Field Encryption Module for SBA Practice System
 *
 * AES-256-GCM encryption for sensitive database fields (CPF, CRM, videoId, etc.).
 * Uses the FIELD_ENCRYPTION_KEY environment variable (32 bytes hex = 64 hex chars).
 *
 * Encrypted format: `iv:authTag:ciphertext` (all hex-encoded)
 *
 * AES-256-GCM provides:
 * - Confidentiality (AES-256 encryption)
 * - Integrity (GCM authentication tag)
 * - Each encryption produces unique output due to random IV
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;       // 96 bits — recommended for GCM
const AUTH_TAG_LENGTH = 16;  // 128 bits — standard GCM tag length
const KEY_LENGTH = 32;       // 256 bits — AES-256

// ---------------------------------------------------------------------------
// Key management
// ---------------------------------------------------------------------------

/**
 * Cache the parsed key Buffer to avoid re-parsing on every call.
 * In serverless environments, this persists across warm invocations.
 */
let cachedKey: Buffer | null = null;

/**
 * Get the encryption key from environment variables.
 *
 * @throws Error if FIELD_ENCRYPTION_KEY is not set or is invalid.
 */
function getEncryptionKey(): Buffer {
  if (cachedKey) return cachedKey;

  const keyHex = process.env.FIELD_ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error(
      'FIELD_ENCRYPTION_KEY environment variable is not set. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    );
  }

  // Validate hex format
  if (!/^[0-9a-fA-F]+$/.test(keyHex)) {
    throw new Error(
      'FIELD_ENCRYPTION_KEY must be a hexadecimal string. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    );
  }

  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `FIELD_ENCRYPTION_KEY must be exactly ${KEY_LENGTH} bytes (${KEY_LENGTH * 2} hex characters). ` +
      `Got ${key.length} bytes (${keyHex.length} hex characters).`,
    );
  }

  cachedKey = key;
  return key;
}

// ---------------------------------------------------------------------------
// Encryption
// ---------------------------------------------------------------------------

/**
 * Encrypt a plaintext string using AES-256-GCM.
 *
 * @param text The plaintext to encrypt.
 * @returns Encrypted string in the format `iv:authTag:ciphertext` (hex-encoded).
 * @throws Error if the encryption key is not configured or text is empty.
 *
 * @example
 * ```ts
 * const encrypted = encrypt("123.456.789-00");
 * // → "a1b2c3d4e5f6a1b2c3d4e5f6:f7e8d9c0b1a2f7e8d9c0b1a2f7e8d9c0:8a9b0c1d2e3f"
 *
 * const original = decrypt(encrypted);
 * // → "123.456.789-00"
 * ```
 */
export function encrypt(text: string): string {
  if (!text) {
    throw new Error('Cannot encrypt empty or falsy value.');
  }

  const key = getEncryptionKey();

  // Generate a random initialization vector for each encryption
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  // Encrypt the text
  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final(),
  ]);

  // Get the authentication tag
  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:ciphertext (all hex)
  return [
    iv.toString('hex'),
    authTag.toString('hex'),
    encrypted.toString('hex'),
  ].join(':');
}

// ---------------------------------------------------------------------------
// Decryption
// ---------------------------------------------------------------------------

/**
 * Decrypt a string that was encrypted with `encrypt()`.
 *
 * @param encryptedText The encrypted string in `iv:authTag:ciphertext` format.
 * @returns The original plaintext.
 * @throws Error if decryption fails (wrong key, tampered data, bad format).
 *
 * @example
 * ```ts
 * const encrypted = encrypt("sensitive data");
 * const decrypted = decrypt(encrypted);
 * console.log(decrypted); // → "sensitive data"
 * ```
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) {
    throw new Error('Cannot decrypt empty or falsy value.');
  }

  const key = getEncryptionKey();

  // Parse the encrypted format
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error(
      'Invalid encrypted text format. Expected "iv:authTag:ciphertext" (hex-encoded).',
    );
  }

  const [ivHex, authTagHex, ciphertextHex] = parts as [string, string, string];

  // Validate hex strings
  if (!ivHex || !authTagHex || !ciphertextHex) {
    throw new Error('Invalid encrypted text: one or more components are empty.');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');

  // Validate component lengths
  if (iv.length !== IV_LENGTH) {
    throw new Error(`Invalid IV length: expected ${IV_LENGTH} bytes, got ${iv.length}.`);
  }

  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error(
      `Invalid auth tag length: expected ${AUTH_TAG_LENGTH} bytes, got ${authTag.length}.`,
    );
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  decipher.setAuthTag(authTag);

  try {
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch (error) {
    // Rethrow with a clearer message
    throw new Error(
      'Decryption failed. The data may be corrupted, the key may be wrong, ' +
      'or the data may have been tampered with. ' +
      (error instanceof Error ? error.message : String(error)),
    );
  }
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/**
 * Check if a string appears to be in the encrypted format.
 * Does NOT verify decryptability — just checks the structural format.
 */
export function isEncrypted(value: string): boolean {
  if (!value || typeof value !== 'string') return false;

  const parts = value.split(':');
  if (parts.length !== 3) return false;

  const [ivHex, authTagHex, ciphertextHex] = parts as [string, string, string];

  // Check hex format and expected lengths
  const hexRegex = /^[0-9a-fA-F]+$/;

  return (
    hexRegex.test(ivHex) &&
    hexRegex.test(authTagHex) &&
    hexRegex.test(ciphertextHex) &&
    ivHex.length === IV_LENGTH * 2 &&
    authTagHex.length === AUTH_TAG_LENGTH * 2 &&
    ciphertextHex.length > 0
  );
}

/**
 * Encrypt a value only if it is not already encrypted.
 * Safe to call multiple times on the same field.
 */
export function encryptIfNeeded(text: string): string {
  if (isEncrypted(text)) return text;
  return encrypt(text);
}

/**
 * Decrypt a value only if it appears to be encrypted.
 * Safe to call on plaintext strings.
 */
export function decryptIfNeeded(text: string): string {
  if (!isEncrypted(text)) return text;
  return decrypt(text);
}

/**
 * Hash a value for storage where the original is not needed (e.g. IP addresses
 * in audit logs). Uses SHA-256. One-way — cannot be reversed.
 */
export function hashValue(value: string): string {
  const { createHash } = require('crypto') as typeof import('crypto');
  return createHash('sha256').update(value).digest('hex');
}

/**
 * Generate a random encryption key. Useful for initial setup.
 *
 * @returns A 64-character hex string suitable for FIELD_ENCRYPTION_KEY.
 */
export function generateEncryptionKey(): string {
  return randomBytes(KEY_LENGTH).toString('hex');
}
