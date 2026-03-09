// src/modules/usuarios/usuarios.controller.ts
import { Body, Controller, Delete, Get, Param, Post, Put, SetMetadata, UseGuards } from '@nestjs/common';
import { CreateUsuarioDto, ParmEmailSchema, ParmIdSchema, UpdateUsuarioDto } from './schemas/usuario.schema';
import { UsuarioService } from './usuario.service';
import { ZodValidationPipe } from 'nestjs-zod';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { AuthDto } from '../auth/dto/auth.dto';

@Controller('usuario')
export class UsuarioController {
  constructor(private readonly service: UsuarioService) {}

  @Get()
  async getAll() {
    return this.service.listarTodos();
  }

  @Get(':id')
  async getOne(@Param('id', new ZodValidationPipe(ParmIdSchema.shape.id)) id: number) {
    return this.service.buscarPorId(id);
  }

  @Get('email/:email')
  async getForEmail(@Param('email', new ZodValidationPipe(ParmEmailSchema.shape.email)) email: string) {
    return this.service.buscarPorEmail(email);
  }

  @Post()
  async create(@Body() data: CreateUsuarioDto) {
    return this.service.criar(data);
  }

  @Post('create') // Protegido por Token e Regra
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @SetMetadata('rule', 'USUARIO_CRIAR') 
  async criar(@Body() data: CreateUsuarioDto) {
    return this.service.criar(data);
  }


  @Put(':id')
  async update(@Param('id', new ZodValidationPipe(ParmIdSchema.shape.id)) id: number, 
               @Body() data: UpdateUsuarioDto) {
    return this.service.atualizar(id, data);
  }

  @Delete(':id')
  async remove(@Param('id', new ZodValidationPipe(ParmIdSchema.shape.id)) id: number) {
    return this.service.excluir(id);
  }
}

