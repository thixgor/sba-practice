/**
 * hCaptcha Verification Module for SBA Practice System
 *
 * Server-side verification of hCaptcha tokens. Used on login, registration,
 * and after 10+ consecutive failed login attempts as specified in the
 * project security requirements.
 *
 * Client-side: Use NEXT_PUBLIC_HCAPTCHA_SITEKEY with the @hcaptcha/react-hcaptcha
 * component or the hCaptcha JS widget.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HCaptchaVerifyResponse {
  /** Whether the token is valid. */
  success: boolean;
  /** ISO timestamp of the challenge. */
  challenge_ts?: string;
  /** Hostname of the site where the challenge was solved. */
  hostname?: string;
  /** Array of error codes if verification failed. */
  'error-codes'?: string[];
}

export interface CaptchaVerifyResult {
  /** Whether the captcha verification was successful. */
  success: boolean;
  /** Error message if verification failed. */
  error?: string;
  /** Raw error codes from hCaptcha. */
  errorCodes?: string[];
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const HCAPTCHA_VERIFY_URL = 'https://hcaptcha.com/siteverify';
const VERIFY_TIMEOUT_MS = 10_000; // 10 seconds

/**
 * Human-readable descriptions for hCaptcha error codes.
 */
const ERROR_MESSAGES: Record<string, string> = {
  'missing-input-secret': 'The secret key is missing.',
  'invalid-input-secret': 'The secret key is invalid or malformed.',
  'missing-input-response': 'The captcha response token is missing.',
  'invalid-input-response': 'The captcha response token is invalid or has expired.',
  'bad-request': 'The request is invalid or malformed.',
  'invalid-or-already-seen-response': 'The captcha token has already been used.',
  'not-using-dummy-passcode': 'Dummy passcode not accepted in production.',
  'sitekey-secret-mismatch': 'The sitekey and secret do not match.',
};

// ---------------------------------------------------------------------------
// Core verification
// ---------------------------------------------------------------------------

/**
 * Verify an hCaptcha token with the hCaptcha server.
 *
 * @param token     The hCaptcha response token from the client.
 * @param remoteIP  Optional client IP for additional validation.
 * @returns         `true` if the token is valid.
 *
 * @example
 * ```ts
 * const captchaToken = body.captchaToken;
 * const isHuman = await verifyCaptcha(captchaToken);
 * if (!isHuman) {
 *   return NextResponse.json({ error: 'Captcha verification failed' }, { status: 400 });
 * }
 * ```
 */
export async function verifyCaptcha(
  token: string,
  remoteIP?: string,
): Promise<boolean> {
  const result = await verifyCaptchaDetailed(token, remoteIP);
  return result.success;
}

/**
 * Verify an hCaptcha token and return detailed results including error info.
 *
 * @param token     The hCaptcha response token from the client.
 * @param remoteIP  Optional client IP for additional validation.
 * @returns         Detailed verification result.
 */
export async function verifyCaptchaDetailed(
  token: string,
  remoteIP?: string,
): Promise<CaptchaVerifyResult> {
  // Validate inputs
  if (!token || typeof token !== 'string') {
    return {
      success: false,
      error: 'Captcha token is required.',
    };
  }

  const secret = process.env.HCAPTCHA_SECRET;
  if (!secret) {
    // In development without hCaptcha configured, log a warning and pass through.
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[captcha] HCAPTCHA_SECRET not set. Skipping verification in development mode.',
      );
      return { success: true };
    }

    return {
      success: false,
      error: 'hCaptcha is not configured. Set HCAPTCHA_SECRET environment variable.',
    };
  }

  try {
    // Build the verification request body
    const params = new URLSearchParams({
      secret,
      response: token,
    });

    if (remoteIP) {
      params.set('remoteip', remoteIP);
    }

    // Add the sitekey if available for additional server-side validation
    const sitekey = process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY;
    if (sitekey) {
      params.set('sitekey', sitekey);
    }

    // Make the verification request with a timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);

    const response = await fetch(HCAPTCHA_VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return {
        success: false,
        error: `hCaptcha API returned status ${response.status}.`,
      };
    }

    const data: HCaptchaVerifyResponse = await response.json();

    if (data.success) {
      return { success: true };
    }

    // Build a meaningful error message from the error codes
    const errorCodes = data['error-codes'] ?? [];
    const errorMessages = errorCodes
      .map((code) => ERROR_MESSAGES[code] || `Unknown error: ${code}`)
      .join(' ');

    return {
      success: false,
      error: errorMessages || 'Captcha verification failed.',
      errorCodes,
    };
  } catch (error) {
    // Handle network errors and timeouts
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        error: 'Captcha verification timed out. Please try again.',
      };
    }

    console.error('[captcha] Verification error:', error);

    return {
      success: false,
      error: 'An error occurred during captcha verification. Please try again.',
    };
  }
}

// ---------------------------------------------------------------------------
// Helper: should captcha be required?
// ---------------------------------------------------------------------------

/**
 * Determine whether CAPTCHA should be required based on consecutive
 * login failures. Per spec: CAPTCHA is mandatory after 10+ failures.
 *
 * @param consecutiveFailures Number of consecutive failed login attempts.
 * @returns `true` if CAPTCHA should be shown.
 */
export function shouldRequireCaptcha(consecutiveFailures: number): boolean {
  return consecutiveFailures >= 10;
}

/**
 * Check whether hCaptcha is configured (secret + sitekey available).
 * Useful for conditionally rendering the captcha widget on the client.
 */
export function isCaptchaConfigured(): boolean {
  return !!(process.env.HCAPTCHA_SECRET && process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY);
}
