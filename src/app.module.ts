// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { envSchema } from './common/config/env.config';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './common/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsuarioModule } from './modules/usuario/usuario.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => {
        return envSchema.parse(config);
      },
    }),
    PrismaModule,
    AuthModule,
    HealthModule,
    UsuarioModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard, },
    { provide: APP_PIPE, useClass: ZodValidationPipe, },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})

export class AppModule {}