export const TOKEN_CONSTANTS = {
  // Access token: 15 minutos (formato que entiende jsonwebtoken)
  ACCESS_TOKEN_EXPIRATION: '1m',
  ACCESS_TOKEN_EXPIRATION_SECONDS: 900, // Para enviar al frontend

  // Refresh token: 7 días
  REFRESH_TOKEN_EXPIRATION_DAYS: 7,
  REFRESH_TOKEN_EXPIRATION_MS: 7 * 24 * 60 * 60 * 1000, // Para calcular expiresAt
} as const;
