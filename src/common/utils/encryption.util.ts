import * as crypto from 'crypto';

/**
 * Utilidad para encriptar y desencriptar datos sensibles
 * Usa AES-256-GCM para encriptación segura
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // Para AES, el IV es siempre de 16 bytes
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Deriva una clave de encriptación desde la clave secreta del entorno
 * @param secret - Clave secreta desde las variables de entorno
 * @param salt - Salt aleatorio para la derivación de la clave
 * @returns Buffer con la clave derivada
 */
function deriveKey(secret: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(secret, salt, 100000, KEY_LENGTH, 'sha256');
}

/**
 * Encripta un texto usando AES-256-GCM
 * @param text - Texto a encriptar
 * @param secret - Clave secreta (debe venir de variable de entorno)
 * @returns Texto encriptado en formato: salt:iv:tag:encryptedData (todo en hexadecimal)
 */
export function encrypt(text: string, secret: string): string {
  if (!text) {
    throw new Error('Text to encrypt cannot be empty');
  }

  if (!secret) {
    throw new Error('Encryption secret is required');
  }

  // Generar salt aleatorio para derivar la clave
  const salt = crypto.randomBytes(SALT_LENGTH);

  // Derivar clave desde el secreto
  const key = deriveKey(secret, salt);

  // Generar IV aleatorio
  const iv = crypto.randomBytes(IV_LENGTH);

  // Crear cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  // Encriptar
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Obtener el tag de autenticación
  const tag = cipher.getAuthTag();

  // Retornar salt:iv:tag:encryptedData (todo en hex)
  return `${salt.toString('hex')}:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Desencripta un texto encriptado con la función encrypt
 * @param encryptedText - Texto encriptado en formato salt:iv:tag:encryptedData
 * @param secret - Clave secreta (debe ser la misma usada para encriptar)
 * @returns Texto desencriptado
 */
export function decrypt(encryptedText: string, secret: string): string {
  if (!encryptedText) {
    throw new Error('Text to decrypt cannot be empty');
  }

  if (!secret) {
    throw new Error('Decryption secret is required');
  }

  try {
    // Separar las partes del texto encriptado
    const parts = encryptedText.split(':');

    if (parts.length !== 4) {
      throw new Error('Invalid encrypted text format');
    }

    const salt = Buffer.from(parts[0], 'hex');
    const iv = Buffer.from(parts[1], 'hex');
    const tag = Buffer.from(parts[2], 'hex');
    const encrypted = parts[3];

    // Derivar la clave usando el mismo salt
    const key = deriveKey(secret, salt);

    // Crear decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    // Configurar el tag de autenticación
    decipher.setAuthTag(tag);

    // Desencriptar
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error(
      `Failed to decrypt data: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}
