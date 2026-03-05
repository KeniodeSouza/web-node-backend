// src/common/guards/auth.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Pegamos o hash enviado pelo cliente no Header
    const clientHash = request.headers['x-api-hash'];
    
    // O hash esperado (em produção, use variáveis de ambiente)
    const secureHash = process.env.API_SECURE_HASH;

    if (!clientHash || clientHash !== secureHash) {
      throw new UnauthorizedException('Acesso negado: Hash de segurança inválido ou ausente.');
    }

    return true;
  }
}
