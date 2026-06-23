import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as argon2 from 'argon2';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwtService: JwtService) {}

  async login(email: string, passwd: string) {
    const user = await this.prisma.usuario.findUnique({
          where: { email },
          include: {
            perfis: { include: {
                        perfil: { include: { 
                            permissoes: { include: { 
                                            permissao: true } } } } }
                    }
          }
    });

    // Verificação com argon2
    if (!user || !(await argon2.verify(user.passwd, passwd))) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Coleta todas as regras (strings) de todos os perfis do usuário
    const rules = user.perfis.flatMap(up => 
      up.perfil.permissoes.map(pp => pp.permissao.regra)
    );

    const payload = { sub: user.id, email: user.email, permissions: rules };
    
    return {
      access_token: await this.jwtService.signAsync(payload),
      user: { nome: user.nome, email: user.email, rules }
    };
  }

  async reset(email: string, passwd: string) {
    const user = await this.prisma.usuario.findUnique({
                                            where: { email }
                      });
    
    return user;      
  }
}
