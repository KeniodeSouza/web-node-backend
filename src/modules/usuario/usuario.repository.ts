import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseRepository } from '../../common/repositories/base.repository';
import { Usuario } from '@prisma/client';
import { CreateUsuarioDto } from './schemas/usuario.schema';

@Injectable()
export class UsuarioRepository extends BaseRepository<Usuario> {
  constructor(prisma: PrismaService) {
    super(prisma, 'usuario'); // 'usuarios' deve bater com o nome no schema.prisma
  }

  async getForEmail(email: string): Promise<Usuario> {
    return (this.prisma[this.model] as any).findUnique({ 
                                                where: { email: email } 
                                              });
  }

  async criar(data: CreateUsuarioDto): Promise<Usuario> {
      return (this.prisma[this.model] as any).create(data);
  }  

}
