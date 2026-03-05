// src/prisma/prisma.module.ts

import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Torna o PrismaService disponível em todo o projeto sem precisar importar o PrismaModule toda hora
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
