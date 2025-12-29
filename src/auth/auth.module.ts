// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminProducerGuard } from './guards/admin-producer.guard';
import { RefreshTokenService } from './refresh-token.service';
import { TOKEN_CONSTANTS } from './constants/token.constants';
import { CleanupTokensTask } from './tasks/cleanup-tokens.task';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secret_hardcoded_para_desarrollo',
      signOptions: {
        expiresIn: TOKEN_CONSTANTS.ACCESS_TOKEN_EXPIRATION, // ← Ahora usa constante (15m)
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    AdminProducerGuard,
    RefreshTokenService,
    CleanupTokensTask, // ← Tarea de limpieza automática
  ],
  exports: [AuthService, RefreshTokenService], // ← AGREGAR RefreshTokenService
})
export class AuthModule {}
