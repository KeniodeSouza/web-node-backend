// src/modules/usuarios/usuarios.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { UsuarioRepository } from './usuario.repository';
import { CreateUsuarioDto, UpdateUsuarioDto } from './schemas/usuario.schema';

@Injectable()
export class UsuarioService {
  constructor(private readonly repository: UsuarioRepository) {}

  async listarTodos() {
    return this.repository.getAll();
  }

  async buscarPorId(id: number) {
    const usuario = await this.repository.getForId(id);
    if (!usuario) throw new NotFoundException('Usuário não encontrado');
    return usuario;
  }

  async buscarPorEmail(email: string) {
    const usuario = await this.repository.getForEmail(email);
    if (!usuario) throw new NotFoundException('Usuário não encontrado');
    return usuario;
  }

  async criar(dados: CreateUsuarioDto) {
    return this.repository.criar(dados);
  }

  async atualizar(id: number, dados: UpdateUsuarioDto) {
    await this.buscarPorId(id); // Valida existência
    return this.repository.update(id, dados);
  }

  async excluir(id: number) {
    await this.buscarPorId(id);
    return this.repository.delete(id);
  }
}
