// src/modules/usuarios/usuarios.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { UsuarioRepository } from './usuario.repository';
import { CreateUsuarioDto, UpdateUsuarioDto } from './schemas/usuario.schema';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsuarioService {
  constructor(private readonly repository: UsuarioRepository) {}

  async listarTodos() {
    return this.repository.getAll().then(list => {
        return list.map(({ passwd, ...usuario }) => usuario);
    });  
  }  

  async buscarPorId(id: number) {
    const retorno = await this.repository.getForId(id);
    if (!retorno) throw new NotFoundException('Usuário não encontrado');
    // Desestruturamos o objeto para extrair o passwd e agrupar o restante
    const { passwd, ...usuario } = retorno;  
    return usuario;
  }

  async buscarPorEmail(email: string) {
    const retorno = await this.repository.getForEmail(email);
    if (!retorno) throw new NotFoundException('Usuário não encontrado');
    // Desestruturamos o objeto para extrair o passwd e agrupar o restante
    const { passwd, ...usuario } = retorno;  
    return usuario;
  }

  async criar(dados: CreateUsuarioDto) {
    const hashed = await bcrypt.hash(dados.passwd, 10);
    const dadosTratado = { ...dados, passwd: hashed };
    const retorno = await this.repository.criar(dadosTratado);
    // Desestruturamos o objeto para extrair o passwd e agrupar o restante
    const { passwd, ...usuario } = retorno;  
    return usuario;
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
