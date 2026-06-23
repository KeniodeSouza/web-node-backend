// src/modules/usuarios/usuarios.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { UsuarioRepository } from './usuario.repository';
import { CreateUsuarioDto, ResetUsuarioDto, UpdateUsuarioDto } from './schemas/usuario.schema';
import * as argon2 from 'argon2';

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
    // Hash da senha com argon2
    const hashed = await argon2.hash(dados.passwd);
    const dadosTratado = { ...dados, passwd: hashed };
    const retorno = await this.repository.criar(dadosTratado);
    const { passwd, ...usuario } = retorno;
    return usuario;
  }

  async renovar(id: number, dados: ResetUsuarioDto) {
    await this.buscarPorId(id); // Valida existência
    // Se o update incluir senha, aplicar hash
    if (dados.passwd) {
      dados.passwd = await argon2.hash(dados.passwd);
    }
    return this.repository.update(id, dados);
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
