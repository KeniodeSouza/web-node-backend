// src/modules/usuarios/usuario.module.ts
import { Module } from '@nestjs/common';
import { UsuarioRepository } from './usuario.repository';
import { UsuarioController } from './usuario.controller';
import { UsuarioService } from './usuario.service';

@Module({
  controllers: [UsuarioController],
  providers: [UsuarioService, UsuarioRepository],
})
export class UsuarioModule {}
