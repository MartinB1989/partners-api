import * as crypto from 'crypto';

/**
 * Genera refresh token criptográficamente seguro
 *
 * - 64 bytes = 512 bits de entropía (muy difícil de adivinar)
 * - base64url = formato URL-safe (sin caracteres especiales)
 */
export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('base64url');
}
