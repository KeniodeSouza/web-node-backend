import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    JwtModule.register({
      global: true, // Torna o JwtService disponível em todo o projeto
      secret: process.env.JWT_SECRET || 'CHAVE_ULTRA_SECRETA_123', // Use .env em produção
      signOptions: { expiresIn: '1h' }, // Token expira em 1 hora
    }),
  ],
  providers: [AuthService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
