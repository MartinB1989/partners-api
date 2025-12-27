import * as bcrypt from 'bcrypt';

/**
 * Hashea token antes de guardarlo en DB (como passwords)
 */
export async function hashRefreshToken(token: string): Promise<string> {
  return bcrypt.hash(token, 10); // 10 rondas como passwords
}

/**
 * Compara token del cliente con hash en DB
 */
export async function compareRefreshToken(
  rawToken: string,
  hashedToken: string,
): Promise<boolean> {
  return bcrypt.compare(rawToken, hashedToken);
}
