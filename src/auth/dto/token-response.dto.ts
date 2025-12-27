export class TokenResponseDto {
  accessToken: string; // JWT de 15 minutos
  refreshToken: string; // Token opaco de 7 días
  expiresIn: number; // 900 (segundos hasta que expire access token)
  tokenType: 'Bearer'; // Tipo para header Authorization
}
