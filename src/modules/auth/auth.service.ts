import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwtService: JwtService) {}

  async login(email: string, pass: string) {
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

    if (!user || !(await bcrypt.compare(pass, user.passwd))) {
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

}
