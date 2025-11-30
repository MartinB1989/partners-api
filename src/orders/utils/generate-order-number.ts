import * as crypto from 'crypto';

/**
 * Genera un número de orden único de 8 caracteres alfanuméricos
 * Utiliza crypto para garantizar aleatoriedad
 */
export function generateOrderNumber(): string {
  // Generar bytes aleatorios
  const randomBytes = crypto.randomBytes(6); // 6 bytes = 48 bits, suficiente para 8 caracteres base32-like

  // Convertir a hexadecimal y tomar los primeros 8 caracteres
  const hex = randomBytes.toString('hex').substring(0, 8).toUpperCase();

  // Asegurar que sea alfanumérico (en caso de que necesitemos mezclar)
  // Este formato ya es hexadecimal (0-9, A-F)
  return hex;
}
