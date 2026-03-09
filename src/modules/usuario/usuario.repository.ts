import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseRepository } from '../../common/repositories/base.repository';
import { Usuario } from '@prisma/client';
import { CreateUsuarioDto } from './schemas/usuario.schema';
import * as bcrypt from 'bcrypt';

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
      const hashed = await bcrypt.hash(data.passwd, 10);
      const result = await this.prisma.usuario.create({
                                      data: {
                                          nome: data.nome,
                                          email: data.email,
                                          passwd: hashed,
                                      }
          })
        //const { passwd, ...result } = newUser;
      return result;
  }  

}
